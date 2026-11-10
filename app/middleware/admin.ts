export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, fetch } = useUserSession()
  await fetch()
  if (to.path === '/admin/login') {
    if (loggedIn.value) return navigateTo('/admin')
    return
  }
  if (!loggedIn.value) return navigateTo('/admin/login')
})
