import { prisma } from '@/lib/prisma'

export interface PlaceCoords {
  name: string
  lat: number
  lng: number
  radio: number
}

export function defaultPlaceCoords(): PlaceCoords {
  return {
    name: 'Oficina',
    lat: Number(process.env.OFFICE_LAT || 0),
    lng: Number(process.env.OFFICE_LNG || 0),
    radio: Number(process.env.MAX_DISTANCE_METERS || 500),
  }
}

export async function getPasantePlaceCoords(pasanteId: string): Promise<PlaceCoords> {
  const pasante = await prisma.pasante.findUnique({
    where: { id: pasanteId },
    include: { lugar: true },
  })

  if (pasante?.lugar?.activo) {
    return {
      name: pasante.lugar.name,
      lat: pasante.lugar.lat,
      lng: pasante.lugar.lng,
      radio: pasante.lugar.radio,
    }
  }

  return defaultPlaceCoords()
}
