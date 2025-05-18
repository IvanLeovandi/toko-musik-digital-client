export function showToast(message: string, type: "info" | "success" | "error" | "warning" = "success") {
  const toast = document.createElement("div")
  toast.className = `alert alert-${type} flex gap-4 items-center shadow-lg`
  toast.innerHTML = `
    <span>${message}</span>
  `
  document.getElementById("toast")?.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 3000)
}
