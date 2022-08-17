<script context="module" lang="ts">
  import type { Load } from '@sveltejs/kit'

  export const load: Load = ({ session }) => {
    if (!session?.user.isAdmin) {
      return { redirect: '/restricted', status: 302 }
    }
    return {}
  }
</script>

<slot />
