export type HealthResponse = {
  status: string
  service: string
}

export type HelloResponse = {
  message: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/health')
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`)
  }
  return res.json()
}

export async function fetchHello(name: string): Promise<HelloResponse> {
  const params = new URLSearchParams({ name })
  const res = await fetch(`/api/hello?${params}`)
  if (!res.ok) {
    throw new Error(`Hello request failed (${res.status})`)
  }
  return res.json()
}
