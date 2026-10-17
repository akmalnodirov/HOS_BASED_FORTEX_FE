<template>
  <main class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="max-w-md rounded-lg border bg-card p-8 text-center shadow-sm">
      <h1 class="text-xl font-semibold text-foreground">Access denied</h1>
      <p class="mt-2 text-sm text-muted-foreground">Your role does not include permission to view this page.</p>
      <RouterLink to="/initial/companies" class="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Choose company</RouterLink>
    </div>
  </main>
</template>
