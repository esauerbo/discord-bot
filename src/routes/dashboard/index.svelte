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
    DatePicker,
    DatePickerInput,
    UnorderedList,
    ListItem,
  } from 'carbon-components-svelte'

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
      <Column><DatePicker datePickerType="range" on:change>
        <DatePickerInput labelText="Range" placeholder="mm/dd/yyyy" />
      </DatePicker></Column>
    </Row>
  </Grid>
</Content>

<style>
  :global(.ha--search-form) {
    display: flex;
    flex-direction: row;

    position: relative;
    left: unset;
    bottom: unset;
    right: unset;
  }

  @media (max-width: 33rem) {
    :global(.ha--search-form) {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
    }
  }

  :global(.ha--questions) {
    display: grid;
    grid-gap: var(--cds-layout-02);
  }
</style>
