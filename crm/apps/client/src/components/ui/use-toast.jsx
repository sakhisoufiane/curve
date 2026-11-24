import * as React from "react";

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 3000;

const ToastContext = React.createContext(null);

function toastReducer(state, action) {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT)
      };
    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t))
      };
    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toastId ? { ...t, open: false } : t
        )
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId)
      };
    default:
      return state;
  }
}

let toastId = 0;

function genId() {
  toastId = (toastId + 1) % Number.MAX_SAFE_INTEGER;
  return toastId.toString();
}

const toastTimeouts = new Map();

function scheduleRemoval(id, dispatch) {
  if (toastTimeouts.has(id)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(id);
    dispatch({ type: "REMOVE_TOAST", toastId: id });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(id, timeout);
}

export function ToastProvider({ children }) {
  const [state, dispatch] = React.useReducer(toastReducer, { toasts: [] });

  const toast = React.useCallback((props) => {
    const id = genId();
    dispatch({
      type: "ADD_TOAST",
      toast: { id, open: true, ...props }
    });
    scheduleRemoval(id, dispatch);
    return {
      id,
      dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id })
    };
  }, []);

  React.useEffect(() => {
    state.toasts.forEach((t) => {
      if (t.open === false) scheduleRemoval(t.id, dispatch);
    });
  }, [state.toasts]);

  const value = React.useMemo(() => ({ toasts: state.toasts, toast, dispatch }), [state.toasts, toast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function toast(props) {
  const event = new CustomEvent("app-toast", { detail: props });
  window.dispatchEvent(event);
}

export function ToastListener() {
  const { toast: addToast } = useToast();

  React.useEffect(() => {
    const handler = (event) => addToast(event.detail);
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, [addToast]);

  return null;
}
