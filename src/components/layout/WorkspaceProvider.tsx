"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { Button } from "@/components/ui";
import { toast } from "@/components/ui/Feedback";
import { LoadingState } from "@/components/ui/LoadingState";
import { Modal } from "@/components/ui/Modal";
import { scheduleSync } from "@/lib/offline/sync";
import {
  activateWorkspace,
  getActiveWorkspaceId,
  GUEST_WORKSPACE,
  isAccountWorkspaceId,
  preloadWorkspace,
  readLastWorkspaceId,
  subscribeWorkspace,
} from "@/lib/offline/workspace";
import {
  chooseGuestData,
  describeGuestData,
  prepareGuestWorkspace,
  reconcileGuestOnSignIn,
  type GuestData,
} from "@/lib/offline/workspace-migration";
import { createClient, readStoredWorkspaceUser, type WorkspaceUser } from "@/lib/supabase/client";
import { AppBootstrap } from "./AppBootstrap";

type WorkspaceRequest = { id: string; user: WorkspaceUser | null };
const guest = { id: GUEST_WORKSPACE, user: null };
type WorkspaceContextValue = WorkspaceRequest & {
  guestData: GuestData | null;
  openGuestTransfer: () => void;
};
const WorkspaceContext = createContext<WorkspaceContextValue>({
  ...guest,
  guestData: null,
  openGuestTransfer: () => undefined,
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const activeId = useSyncExternalStore(
    subscribeWorkspace,
    getActiveWorkspaceId,
    () => GUEST_WORKSPACE,
  );
  const [request, setRequest] = useState<WorkspaceRequest | null>(null);
  const [readyId, setReadyId] = useState<string | null>(null);
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [offer, setOffer] = useState(false);
  const [moving, setMoving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const desiredId = useRef<string | null>(null);
  const requestedId = request?.id;

  useEffect(() => {
    const client = createClient();
    if (!client) {
      desiredId.current = guest.id;
      setRequest(guest);
      return;
    }
    let alive = true;
    let changed = false;
    const remembered = readLastWorkspaceId();
    // Warm the remembered database while auth restores its local session. Keep the UI gated.
    const initial =
      remembered === GUEST_WORKSPACE
        ? Promise.resolve()
        : preloadWorkspace(remembered).catch(() => undefined);
    function apply(user: WorkspaceUser | null) {
      if (!alive) return;
      const id = isAccountWorkspaceId(user?.id) ? user.id : GUEST_WORKSPACE;
      desiredId.current = id;
      setRequest({ id, user: id === GUEST_WORKSPACE ? null : user });
    }
    function applyRestored(user: WorkspaceUser | null) {
      if (!changed) apply(user);
    }
    const stored = readStoredWorkspaceUser();
    if (!navigator.onLine && remembered !== GUEST_WORKSPACE) {
      void stored.then((user) => {
        if (user?.id === remembered) applyRestored(user);
      });
    }
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      // An empty initial event can also mean a failed offline refresh.
      if (event === "INITIAL_SESSION" && !session) return;
      changed = true;
      apply(session?.user ?? null);
    });
    void client.auth
      .getSession()
      .then(async ({ data, error }) => {
        await initial;
        const user = isAuthRetryableFetchError(error)
          ? await readStoredWorkspaceUser()
          : (data.session?.user ?? null);
        applyRestored(user);
      })
      .catch(() => {
        if (navigator.onLine) applyRestored(null);
        else void stored.then(applyRestored);
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!requestedId) return;
    let alive = true;
    const current = () => alive && desiredId.current === requestedId;
    setFailed(false);
    setReadyId(null);
    setGuestData(null);
    setOffer(false);
    async function open(id: string) {
      // Without Supabase there are no accounts to isolate: parking owned data in an
      // account workspace would leave it unreachable, so the guest space stays as is.
      const accountsEnabled = Boolean(createClient());
      const result =
        id === GUEST_WORKSPACE
          ? accountsEnabled
            ? await prepareGuestWorkspace().then(() => null)
            : null
          : await reconcileGuestOnSignIn(id);
      if (!current()) return;
      await activateWorkspace(id);
      if (!current()) return;
      setGuestData(result?.data ?? null);
      setOffer(Boolean(result?.offer));
      setReadyId(id);
      scheduleSync(0);
      if (result?.foundOtherAccount) {
        toast("Encontramos datos de otra cuenta en este dispositivo y los guardamos aparte.");
      }
    }
    void open(requestedId).catch(() => {
      if (current()) setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [requestedId, attempt]);

  async function decide(choice: "keep" | "move") {
    if (!requestedId || requestedId === GUEST_WORKSPACE || moving) return;
    setMoving(true);
    try {
      const data = await chooseGuestData(requestedId, choice);
      if (desiredId.current !== requestedId) return;
      setGuestData(data);
      setOffer(false);
      if (choice === "move") {
        toast("Los datos sin cuenta se pasaron a tu cuenta.", "ok");
        scheduleSync(0);
      }
    } catch {
      if (desiredId.current === requestedId)
        toast("No se pudo terminar el traslado de los datos. Puedes volver a intentarlo.", "error");
    } finally {
      setMoving(false);
    }
  }

  return (
    <>
      <AppBootstrap />
      {request && request.id === readyId && activeId === readyId ? (
        <WorkspaceContext.Provider
          key={readyId}
          value={{ ...request, guestData, openGuestTransfer: () => setOffer(true) }}
        >
          {children}
          {offer && guestData?.hasData && (
            <Modal
              title="Datos sin cuenta en este dispositivo"
              description={describeGuestData(guestData) + " ¿Quieres pasarlos a tu cuenta?"}
              onClose={() => void decide("keep")}
            >
              <div className="confirm-actions">
                <Button variant="secondary" disabled={moving} onClick={() => void decide("keep")}>
                  Mantenerlos sin cuenta
                </Button>
                <Button variant="primary" disabled={moving} onClick={() => void decide("move")}>
                  {moving ? "Trasladando…" : "Pasar a mi cuenta"}
                </Button>
              </div>
            </Modal>
          )}
        </WorkspaceContext.Provider>
      ) : failed ? (
        <div className="loading-state">
          <p role="alert">No se pudo abrir el espacio de trabajo.</p>
          <Button onClick={() => setAttempt((previous) => previous + 1)}>Reintentar</Button>
        </div>
      ) : (
        <LoadingState label="Cargando espacio de trabajo…" />
      )}
    </>
  );
}
