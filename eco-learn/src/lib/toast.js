import { toast } from "react-toastify";

const defaultOptions = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "colored",
};

export function showSuccessToast(message, options = {}) {
  toast.success(message, { ...defaultOptions, ...options });
}

export function showErrorToast(message, options = {}) {
  toast.error(message, { ...defaultOptions, ...options });
}

export function showInfoToast(message, options = {}) {
  toast.info(message, { ...defaultOptions, ...options });
}

export function showWarningToast(message, options = {}) {
  toast.warning(message, { ...defaultOptions, ...options });
}

export { toast };
