'use client'

export function ConsoleSignOutButton() {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!window.confirm('Sign out of the console?')) {
      event.preventDefault()
    }
  }

  return (
    <form action="/auth/signout" method="post" onSubmit={handleSubmit}>
      <button
        type="submit"
        className="inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5"
      >
        Sign out
      </button>
    </form>
  )
}
