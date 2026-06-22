import { notFound } from 'next/navigation'
import { getOrgForMember } from '@/lib/orgs'
import { getLocationsForOrg } from '@/lib/locations'
import { createLocation } from '../../actions'
import { AddLocationForm } from '../add-location-form'
import { DeleteLocationButton } from '../delete-location-button'
import { ConsolePage, ConsoleHeader, ConsoleSection, ConsoleCard, Disclosure } from '../../_components/console-ui'

type Props = {
  params: Promise<{ orgSlug: string }>
}

export default async function LocationsPage({ params }: Props) {
  const { orgSlug } = await params
  const org = await getOrgForMember(orgSlug)

  if (!org) {
    notFound()
  }

  const locations = await getLocationsForOrg(org.id)
  const addLocation = createLocation.bind(null, orgSlug)

  return (
    <ConsolePage>
      <ConsoleHeader
        title="Locations"
        description="Where your sessions happen — in person or online."
        backHref={`/console/${orgSlug}`}
        backLabel="Console"
      />

      <div className="mt-8">
        <ConsoleSection title={`Locations (${locations.length})`}>
          <div className="space-y-4">
            {locations.length > 0 ? (
              <ul className="space-y-2">
                {locations.map((loc) => (
                  <li key={loc.id}>
                    <ConsoleCard className="min-w-0 text-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-100">{loc.label}</div>
                          {loc.is_online ? (
                            <div className="mt-0.5 text-xs text-zinc-500">
                              Online{loc.meeting_url ? ' · meeting link set' : ''}
                            </div>
                          ) : loc.address ? (
                            <div className="mt-0.5 text-xs text-zinc-500">{loc.address}</div>
                          ) : null}
                        </div>
                        <DeleteLocationButton
                          orgSlug={orgSlug}
                          locationId={loc.id}
                          locationLabel={loc.label}
                        />
                      </div>
                    </ConsoleCard>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No locations yet. Add your first one below.</p>
            )}
            <Disclosure summary="+ Add location">
              <AddLocationForm addLocation={addLocation} />
            </Disclosure>
          </div>
        </ConsoleSection>
      </div>
    </ConsolePage>
  )
}
