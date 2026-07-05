import { vi } from 'vitest'

export function createRouterMock() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }
}

export function createSearchParamsMock(params: Record<string, string> = {}) {
  const searchParams = new URLSearchParams(params)
  return {
    get: (key: string) => searchParams.get(key),
    toString: () => searchParams.toString(),
  }
}

export function mockNextNavigation(options?: {
  router?: ReturnType<typeof createRouterMock>
  searchParams?: Record<string, string>
}) {
  const router = options?.router ?? createRouterMock()
  const searchParams = createSearchParamsMock(options?.searchParams)

  vi.mock('next/navigation', () => ({
    useRouter: () => router,
    useSearchParams: () => searchParams,
    usePathname: () => '/',
  }))

  return { router, searchParams }
}
