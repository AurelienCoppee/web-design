import { type VoidComponent, createSignal, For, Show, createMemo } from "solid-js";
import { Meta, Title } from "@solidjs/meta";
import { createAsync, query } from "@solidjs/router";
import { getSession as getServerSession } from "@auth/solid-start";
import { authOptions } from "~/server/auth";
import AddEventFAB from "~/components/AddEventFAB";
import CreateEventModal from "~/components/CreateEventModal";
import EventDetailModal from "~/components/EventDetailModal";
import { getUpcomingEvents, type EventWithOrganizer } from "~/server/queries/eventQueries";
import { getRequestEvent } from "solid-js/web";

const getSessionQuery = query(async () => {
  "use server";
  const event = getRequestEvent();
  if (!event) return null;
  return await getServerSession(event.request, authOptions);
}, "sessionIndexPage");


const Home: VoidComponent = () => {
  const sessionData = createAsync(() => getSessionQuery());
  const eventsResource = createAsync(() => getUpcomingEvents());

  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = createSignal(false);
  const [isEventDetailModalOpen, setIsEventDetailModalOpen] = createSignal(false);
  const [selectedEvent, setSelectedEvent] = createSignal<EventWithOrganizer | null>(null);


  const openEventDetails = (event: EventWithOrganizer) => {
    setSelectedEvent(event);
    setIsEventDetailModalOpen(true);
  };

  const formatDateHeading = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatTime = (dateString: string | Date) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const groupedEvents = createMemo(() => {
    const groups: Record<string, EventWithOrganizer[]> = {};
    (eventsResource() || []).forEach(event => {
      const eventDate = new Date(event.date).toDateString();
      if (!groups[eventDate]) {
        groups[eventDate] = [];
      }
      groups[eventDate].push(event);
    });
    return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
  });

  const canCreateEvent = createMemo(() => {
    const user = sessionData()?.user;
    return !!user && (user.role === "ORGANIZER" || user.role === "ADMIN");
  });

  return (
    <>
      <Title>Ralvo</Title>
      <Meta name="description" content="Parcourez les événements à venir." />
      <main class="min-h-screen bg-background text-on-background pt-20 pb-10 px-4 md:px-8">
        <div class="container mx-auto">
          <h1 class="text-4xl font-bold tracking-tight text-on-background mb-8 text-center">
            Événements à Venir
          </h1>

          <Show when={eventsResource.loading}>
            <p class="text-center text-lg text-on-surface-variant">Chargement des événements...</p>
          </Show>

          <Show when={!eventsResource.loading && groupedEvents().length === 0}>
            <p class="text-center text-lg text-on-surface-variant">Aucun événement à venir pour le moment.</p>
          </Show>

          <For each={groupedEvents()}>
            {([date, eventsOnDate]) => (
              <div class="mb-8">
                <h2 class="text-2xl font-semibold text-primary mb-4 border-b border-outline-variant pb-2">
                  {formatDateHeading(eventsOnDate[0].date)}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <For each={eventsOnDate}>
                    {(event) => (
                      <div
                        class="bg-surface-container rounded-lg shadow-mat-level1 p-5 cursor-pointer hover:shadow-mat-level3 transition-shadow"
                        onClick={() => openEventDetails(event)}
                      >
                        <h3 class="text-xl font-semibold text-on-surface-variant mb-1">{event.title}</h3>
                        <p class="text-sm text-primary mb-2">{formatTime(event.date)}</p>
                        <p class="text-sm text-on-surface-variant mb-1">{event.city}, {event.region}</p>
                        <p class="text-xs text-on-surface-variant/70 line-clamp-2">{event.description}</p>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>

        <Show when={canCreateEvent()}>
          <AddEventFAB onClick={() => setIsCreateEventModalOpen(true)} />
        </Show>
      </main>

      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        setIsOpen={setIsCreateEventModalOpen}
      />
      <EventDetailModal
        isOpen={isEventDetailModalOpen}
        setIsOpen={setIsEventDetailModalOpen}
        event={selectedEvent}
      />
    </>
  );
};

export default Home;
