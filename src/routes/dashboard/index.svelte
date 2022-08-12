<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit'

  export const load: Load = ({ props }) => {
    return {
      props,
    }
  }
</script>

<script lang="ts">
  import { Button, Content, Grid, Row, Column } from 'carbon-components-svelte'
  import { binDates, timeBetweenDates } from './applyFilter'
  import RangeOfDates from './RangeOfDates.svelte'
  import type { AnsweredQuestion, QuestionCategories } from './types'

  export let questions: QuestionCategories
  export let name: string
  export let memberCount: number
  export let presenceCount: number

  let today = new Date()
  let endDate = today
  let startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1)
  let dates: Date[] = timeBetweenDates('months', [startDate, endDate])
  let filtered = binDates(dates, questions)
  console.log(filtered)

  $: filtered = binDates(dates, questions)
  $: total = filtered.get('aggregate')?.total ?? ''
  $: unanswered = filtered.get('aggregate')?.unanswered ?? ''
  $: staff = filtered.get('aggregate')?.staff ?? ''
  $: community = filtered.get('aggregate')?.community ?? ''
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
        <RangeOfDates
          bind:dates
          today="{today}"
          startDate="{startDate}"
          endDate="{endDate}"
        />
      </Column>
    </Row>
    <Row><Button on:click="{() => console.log(dates)}">Cliick</Button></Row>
    <Row>
      <Column
        ><h1>{total}</h1>
        <h2>Total Questions</h2></Column
      >
      <Column
        ><h1>{unanswered}</h1>
        <h2>Answered by Staff</h2></Column
      >
      <Column
        ><h1>{staff}</h1>
        <h2>Answered by Community</h2></Column
      >
      <Column
        ><h1>{community}</h1>
        <h2>Unanswered</h2></Column
      >
    </Row>
  </Grid>
</Content>
