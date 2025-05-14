import { ErrorBoundary, Suspense, For } from 'solid-js'
import { query, createAsync, type RouteDefinition } from '@solidjs/router'
import SiteTitle from "~/components/SiteTitle";
import { Meta } from "@solidjs/meta";

const getPosts = query(async () => {
  'use server'
  const posts = await fetch("https://my-api.com/posts");
  return await posts.json();
}, "posts");

export const route = {
  preload: () => getPosts(),
} satisfies RouteDefinition

export default function Home() {
  const posts = createAsync(() => getPosts());
  return (
    <>
      <SiteTitle>Home</SiteTitle>
      <Meta name="description" content="This is my content tag." />
      <main class="text-center mx-auto text-gray-700 p-4">
        <ul>
          <ErrorBoundary fallback={<div>Something went wrong!</div>}>
            <Suspense fallback={<div>Loading...</div>}>
              <For each={posts()}>{(post) => <li>{post.title}</li>}</For>
            </Suspense>
          </ErrorBoundary>
        </ul>
      </main>
    </>
  );
}
