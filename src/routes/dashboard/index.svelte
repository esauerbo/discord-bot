<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit'

  export const load: Load = ({ props }) => {
    return {
      props,
    }
  }
</script>

<script lang="ts">
  import '@carbon/styles/css/styles.css'
  import '@carbon/charts/styles.css'
  import { BarChartStacked, StackedAreaChart } from '@carbon/charts-svelte'
  import { Column, Content, Grid, Row, Tag } from 'carbon-components-svelte'
  import { ArrowUp, Group } from 'carbon-icons-svelte'
  import { filterQuestions, timeBetweenDates } from './applyFilter'
  import FilterMenu from './FilterMenu.svelte'
  import type { Question } from '@prisma/client'
  import type { QuestionCategories, QuestionCategoriesCounts } from './types'
  export let questions: QuestionCategories
  export let name: string
  export let memberCount: number
  export let presenceCount: number

  let today = new Date()
  let endDate = today
  let startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1)
  let dates: Date[] = timeBetweenDates('months', [startDate, endDate])
  let channels = Array.from(new Set(questions.total.map((question: Question) => question.channelName)))
  let filtered = filterQuestions(channels, dates, questions)

  const getBarData = (filtered: Map<string, QuestionCategoriesCounts>) => {
    const map = new Map(filtered)
    map.delete('aggregate')
    const values: Record<string, any>[] = []
    for (const [date, questionCategories] of map) {
      Object.entries(questionCategories).forEach(([category, count]) => {
        values.push({ group: category, key: date, value: count })
      })
    }
    return values
  }

  $: filtered = filterQuestions(channels, dates, questions)

  $: total = filtered.get('aggregate')?.total ?? ''
  $: unanswered = filtered.get('aggregate')?.unanswered ?? ''
  $: unansweredPct =
    total && unanswered
      ? `${Math.round((100 * parseInt(unanswered)) / parseInt(total))}%`
      : ''
  $: staff = filtered.get('aggregate')?.staff ?? ''
  $: staffPct =
    total && staff
      ? `${Math.round((100 * parseInt(staff)) / parseInt(total))}%`
      : ''
  $: community = filtered.get('aggregate')?.community ?? ''
  $: communityPct =
    total && staff
      ? `${Math.round((100 * parseInt(community)) / parseInt(total))}%`
      : ''

  $: data = getBarData(filtered)
</script>

<svelte:head>
  <title>{name} Discord Metrics Dashboard></title>
</svelte:head>

<Content>
  <Grid>
    <Row>
      <Column class="members-count" style="background: rgb(15, 98, 254, 0.1);">
        <h1>
          {memberCount}
          <ArrowUp size="{32}" color="var(--cds-interactive-01, #0f62fe)" />
        </h1>
        <h4 class="number-text">Total Members</h4>
      </Column>
      <Column class="members-count" style="background: rgb(0, 255, 0, 0.1);">
        <h1>{presenceCount} <Group size="{32}" color="green" /></h1>
        <h4 class="number-text">Members Online</h4>
      </Column>
    </Row>
    <Row class="date-container">
      <Column style="max-width:min-content"
        ><h2 style="font-weight: lighter;">Questions</h2></Column
      >
      <Column>
        <FilterMenu
          bind:dates
          bind:channels
          today="{today}"
          startDate="{startDate}"
          endDate="{endDate}"
        />
      </Column>
    </Row>
    <Row>
      <Column
        class="split-counts"
        style="outline-color: rgb(255, 255, 255, 0.5);"
      >
        <h1>{total}</h1>
        <h4 class="number-text">Total Questions</h4>
      </Column>
      <Column
        class="split-counts"
        style="color: rgb(255, 153, 0); outline-width:0"
      >
        <h1>
          {staff}
          <Tag style="background-color:rgb(255, 153, 0, 0.6)">{staffPct}</Tag>
        </h1>
        <h4 class="number-text">Answered by Staff</h4>
      </Column>
      <Column class="split-counts" style="outline-color:rgb(15, 98, 254, 0.6)">
        <h1>
          {community}
          <Tag style="background-color:rgb(15, 98, 254, 0.6)"
            >{communityPct}</Tag
          >
        </h1>
        <h4 class="number-text">Answered by Community</h4>
      </Column>
      <Column
        class="split-counts"
        style="background-color: rgb(255, 0, 0, 0.2); outline-width:0"
      >
        <h1>
          {unanswered}
          <Tag style="background-color:rgb(255, 0, 0, 0.4)">{unansweredPct}</Tag
          >
        </h1>
        <h4 class="number-text">Unanswered</h4>
      </Column>
    </Row>
    <Row style="margin-top:16px">
      <BarChartStacked
        bind:data
        options="{{
          title: '',
          axes: {
            left: {
              title: 'Questions',
              mapsTo: 'value',
              stacked: true,
            },
            bottom: {
              title: 'Date',
              mapsTo: 'key',
              scaleType: 'time',
            },
          },
          grid: {
            x: {
              enabled: false,
            },
          },
          height: '400px',
        }}"
        theme="g100"
        tooltip="{{
          customHTML: {},
        }}"
      /></Row
    >
    <Row style="margin-top:16px">
      <StackedAreaChart
        bind:data
        options="{{
          title: '',
          axes: {
            left: {
              title: 'Questions',
              mapsTo: 'value',
              stacked: true,
            },
            bottom: {
              title: 'Date',
              mapsTo: 'key',
              scaleType: 'time',
            },
          },
          grid: {
            x: {
              enabled: false,
            },
          },
          height: '400px',
        }}"
        theme="g100"
        tooltip="{{
          customHTML: {},
        }}"
      />
    </Row>
  </Grid>
</Content>

<style>
  :global(.members-count) {
    flex-direction: row;
    position: relative;
    left: unset;
    bottom: unset;
    right: unset;
    margin: 6px;
    padding: 12px;
    border-radius: 10px;
  }

  :global(.number-text) {
    font-weight: lighter;
  }

  :global(.members-count > h1) {
    font-size: 60px;
  }

  :global(.date-container) {
    flex-direction: row;
    position: relative;
    margin-top: 6px;
    padding-top: 12px;
    width: 100%;
  }

  :global(.split-counts) {
    background: rgb(198, 198, 198, 0.05);
    margin: 6px;
    padding: 12px;
    margin-top: 20px;
    outline-style: solid;
    outline-width: thin;
    border-radius: 10px;
  }
</style>
