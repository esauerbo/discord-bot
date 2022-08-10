<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit'

  export const load: Load = ({ props }) => {
    console.log(props)
    return {
      props,
    }
  }
</script>

<script lang="ts">
  import {
    Content,
    Grid,
    Row,
    Column,
    Dropdown,
  } from 'carbon-components-svelte'
  import RangeOfDates from './Datepickers/RangeOfDates.svelte';

  export let name: string
  export let memberCount: number
  export let presenceCount: number
</script>

<svelte:head>
  <title>{name} Discord Metrics Dashboard></title>
</svelte:head>

<Content>
  <Grid>
    <Row>
      <Column class="ha--questions">
        <h1>{name} Discord Metrics Dashboard</h1>
      </Column>
    </Row>
    <Row>
      <Column>
        <h2>{memberCount} Total Members</h2>
      </Column>
      <Column>
        <h2>{presenceCount} Online Members</h2>
      </Column>
    </Row>
    <Row>
      <Column><h1>Questions</h1></Column>
      <Column>
        <svelte:component this="{RangeOfDates}" />
      </Column>
    </Row>
  </Grid>
</Content>
