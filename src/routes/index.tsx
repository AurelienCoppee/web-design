import {
  type VoidComponent,
  createSignal,
  For,
  Show,
  createMemo,
  lazy,
  Suspense,
  onMount,
  onCleanup,
  createResource,
  createEffect
} from "solid-js";
import { Meta, Title, Link } from "@solidjs/meta";
import { createAsync, useSubmissions, revalidate, useSubmission } from "@solidjs/router";
import AddEventFAB from "~/components/AddEventFAB";
const CreateEventModal = lazy(() => import("~/components/modal/CreateEventModal"));
const EventDetailModal = lazy(() => import("~/components/modal/EventDetailModal"));
import { getUpcomingEvents, type EventWithDetails } from "~/server/queries/eventQueries";
import { getAuthSession } from "~/server/queries/sessionQueries";
import { createEventAction } from "~/server/actions/eventActions";
import { markEventInterestAction, removeEventInterestAction } from "~/server/actions/userEventInterestActions";
import { getMyEventInterests, getUserInterestsForDay, getEventInterestCountForUser } from "~/server/queries/userEventInterestQueries";

const generateEventSchema = (event: EventWithDetails) => ({
  "@context": "https://schema.org",
  "@type": "Event",
  "name": event.title,
  "startDate": new Date(event.date).toISOString(),
  "description": event.description,
  "location": {
    "@type": "Place",
    "name": event.address,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": event.address,
      "addressLocality": event.city,
      "addressRegion": event.region,
      "addressCountry": "BE"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": event.lat,
      "longitude": event.lng
    }
  },
  "organizer": {
    "@type": "Organization",
    "name": event.organization?.name || "Ralvo Community",
    "url": "https://ralvo.be"
  }
});

const Home: VoidComponent = () => {
  const sessionData = createAsync(() => getAuthSession());
  const eventsResource = createAsync(() => getUpcomingEvents());
  const pendingEventSubmissions = useSubmissions(createEventAction);

  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = createSignal(false);
  const [isEventDetailModalOpen, setIsEventDetailModalOpen] = createSignal(false);
  const [selectedEvent, setSelectedEvent] = createSignal<EventWithDetails | null>(null);

  const openEventDetails = (event: EventWithDetails) => {
    setSelectedEvent(event);
    setIsEventDetailModalOpen(true);
  };

  const formatDateHeading = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatTime = (dateString: string | Date) => {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: '2-digit', minute: '2-digit'
    });
  };

  const groupedEvents = createMemo(() => {
    const rawEventsData = eventsResource();
    if (eventsResource.loading || !Array.isArray(rawEventsData)) return [];
    const groups: Record<string, EventWithDetails[]> = {};
    rawEventsData.forEach(event => {
      const eventDate = new Date(event.date);
      const dateKey = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate()).toISOString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    });
    return Object.entries(groups).sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime());
  });

  const canCreateEvent = createMemo(() => {
    const user = sessionData()?.user;
    return user && (user.role === "ADMIN" || (user.administeredOrganizations && user.administeredOrganizations.length > 0));
  });

  const handleEventCreated = () => revalidate(getUpcomingEvents.key);

  onMount(() => {
    const POLLING_INTERVAL = 30000;
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') revalidate(getUpcomingEvents.key);
    }, POLLING_INTERVAL);
    onCleanup(() => clearInterval(intervalId));
  });

  const [myInterests, { refetch: refetchMyInterests }] = createResource(() => sessionData()?.user?.id, (userId) => userId ? getMyEventInterests(userId) : Promise.resolve([]));
  const isInterestedInEvent = (eventId: string) => myInterests()?.some(interest => interest.eventId === eventId);
  const eventInterestActionSubmission = useSubmission(markEventInterestAction);
  const removeInterestActionSubmission = useSubmission(removeEventInterestAction);
  const isProcessingInterest = (eventId: string) => (eventInterestActionSubmission.pending && eventInterestActionSubmission.input?.get('eventId') === eventId) || (removeInterestActionSubmission.pending && removeInterestActionSubmission.input?.get('eventId') === eventId);

  const handleInterestToggle = async (event: EventWithDetails) => {
    if (!sessionData()?.user?.id) return;
    const formData = new FormData();
    formData.append("eventId", event.id);
    const eventDateStr = new Date(event.date).toISOString().split('T')[0];
    const interestOnDay = await getUserInterestsForDay(sessionData()!.user!.id, eventDateStr);
    if (isInterestedInEvent(event.id)) {
      await removeEventInterestAction(formData);
    } else {
      if (interestOnDay && interestOnDay.eventId !== event.id) { }
      await markEventInterestAction(formData);
    }
    refetchMyInterests();
  };

  return (
    <>
      <Title>Ralvo</Title>
      <Meta name="description" content="Ralvo est la plateforme dédiée aux événements sportifs en plein air. Découvrez, créez et partagez des activités près de chez vous, en pleine nature." />
      <Meta name="keywords" content="randonnée, vélo, gravel, course, événements, sport, communauté, Ralvo" />
      <Meta name="author" content="Aurélien Coppée" />
      <Meta name="theme-color" content="#a359ff" />
      <Meta property="og:type" content="website" />
      <Meta property="og:url" content="https://ralvo.be/" />
      <Meta property="og:title" content="Ralvo - Événements Sportifs en Plein Air" />
      <Meta property="og:description" content="Ralvo est votre plateforme pour découvrir, créer et partager des événements sportifs extérieurs. Rejoignez une communauté active et vivez l'aventure." />
      <Meta property="twitter:card" content="summary_large_image" />
      <Meta property="twitter:url" content="https://ralvo.be/" />
      <Meta property="twitter:title" content="Ralvo - Événements Sportifs en Plein Air" />
      <Meta property="twitter:description" content="Ralvo est votre plateforme pour découvrir, créer et partager des événements sportifs extérieurs. Rejoignez une communauté active et vivez l'aventure." />
      <Link rel="canonical" href="https://ralvo.be/" />
      <Show when={eventsResource() && !eventsResource.loading}>
        <script type="application/ld+json">
          {JSON.stringify(eventsResource()!.map(generateEventSchema))}
        </script>
      </Show>
      <div class="min-h-screen bg-background text-on-background pt-20 pb-10 px-4 sm:px-6 lg:px-8">
        <div class="container mx-auto">
          <h1 class="text-display-medium font-bold tracking-tight text-on-background mb-10 text-center">Événements à Venir</h1>
          <For each={pendingEventSubmissions}>
            {(submission) => (
              <Show when={submission.pending && submission.input}>
                <div class="my-4 p-4 bg-primary-container text-on-primary-container rounded-mat-corner-medium text-center animate-pulse font-body-medium">
                  Création de l'événement en cours:
                  <Show when={(submission.input[0] as FormData)?.get('title') as string | undefined}>{title => ` "${title()}"...`}</Show>
                </div>
              </Show>
            )}
          </For>
          <Show when={eventsResource.loading && !pendingEventSubmissions.some(s => s.pending)}><p class="text-center text-body-large text-on-surface-variant py-10">Chargement des événements...</p></Show>
          <Show when={!eventsResource.loading && groupedEvents().length === 0 && !pendingEventSubmissions.some(s => s.pending && s.input)}><p class="text-center text-body-large text-on-surface-variant py-10">Aucun événement à venir pour le moment.</p></Show>
          <For each={groupedEvents()}>
            {([date, eventsOnDate]) => (
              <div class="mb-10">
                <h2 class="text-headline-small text-primary mb-6 border-b-2 border-outline-variant pb-3">{formatDateHeading(eventsOnDate[0].date)}</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <For each={eventsOnDate}>
                    {(event) => {
                      const [interestCountResource, { refetch: refetchInterestCount }] = createResource(() => event.id, getEventInterestCountForUser);
                      createEffect(() => {
                        if (eventInterestActionSubmission.result || removeInterestActionSubmission.result) {
                          if (eventInterestActionSubmission.input?.get('eventId') === event.id || removeInterestActionSubmission.input?.get('eventId') === event.id) {
                            refetchInterestCount();
                            refetchMyInterests();
                          }
                        }
                      });
                      return (
                        <div class="bg-surface-container rounded-mat-corner-extra-large shadow-mat-level2 p-5 flex flex-col justify-between transition-all hover:shadow-mat-level4">
                          <div>
                            <div class="cursor-pointer" onClick={() => openEventDetails(event)}>
                              <h3 class="text-title-large font-semibold text-on-surface-variant mb-1.5">{event.title}</h3>
                              <p class="text-label-medium text-primary mb-2.5">{formatTime(event.date)}</p>
                              <Show when={event.organization}><p class="text-label-small text-tertiary mb-1.5">Par: {event.organization!.name}</p></Show>
                              <p class="text-body-medium text-on-surface-variant mb-1.5">{event.city}, {event.region}</p>
                              <p class="text-body-small text-on-surface-variant/80 line-clamp-3">{event.description}</p>
                            </div>
                            <Show when={sessionData()?.user?.id && event.organizationId && sessionData()?.user?.administeredOrganizations?.some(org => org.id === event.organizationId)}>
                              <p class="text-label-small text-on-surface-variant mt-2.5">Personnes intéressées : {interestCountResource() ?? '0'}</p>
                            </Show>
                          </div>
                          <Show when={sessionData()?.user}>
                            <button onClick={() => handleInterestToggle(event)} disabled={isProcessingInterest(event.id)} class={`mt-4 w-full py-2.5 px-4 rounded-mat-corner-full font-label-large transition-colors ${isInterestedInEvent(event.id) ? 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80' : 'bg-primary text-on-primary hover:brightness-110'} disabled:opacity-60 disabled:cursor-not-allowed`}>
                              {isProcessingInterest(event.id) ? <span class="animate-pulse">Mise à jour...</span> : (isInterestedInEvent(event.id) ? "Ne plus être intéressé" : "Je suis intéressé")}
                            </button>
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            )}
          </For>
        </div>
        <Show when={canCreateEvent()}><AddEventFAB onClick={() => setIsCreateEventModalOpen(true)} /></Show>
      </div>
      <Suspense fallback={<div class="fixed inset-0 bg-scrim/30 flex items-center justify-center text-on-primary-container p-4 rounded-mat-corner-medium">Chargement du modal...</div>}>
        <CreateEventModal isOpen={isCreateEventModalOpen} setIsOpen={setIsCreateEventModalOpen} onEventCreated={handleEventCreated} />
      </Suspense>
      <Suspense fallback={<div class="fixed inset-0 bg-scrim/30 flex items-center justify-center text-on-primary-container p-4 rounded-mat-corner-medium">Chargement des détails...</div>}>
        <EventDetailModal isOpen={isEventDetailModalOpen} setIsOpen={setIsEventDetailModalOpen} event={selectedEvent} />
      </Suspense>
    </>
  );
};

export default Home;
