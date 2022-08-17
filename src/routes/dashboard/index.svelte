<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit'

  export const load: Load = ({ props }) => {
    console.log(props)
    return {
     props: {...props, allContributors: JSON.parse(props.allContributors)}
    }
  }
</script>

<script lang="ts">
  import '@carbon/styles/css/styles.css'
  import '@carbon/charts/styles.css'
  import {
    BarChartStacked,
    PieChart,
    StackedAreaChart,
  } from '@carbon/charts-svelte'
  import {
    Column,
    Content,
    DataTable,
    Grid,
    Row,
    Tag,
  } from 'carbon-components-svelte'
  import { ArrowUp, CaretUp, Category, Group } from 'carbon-icons-svelte'
  import { filterAnswers, filterQuestions, timeBetweenDates } from './applyFilter'
  import FilterMenu from './FilterMenu.svelte'
  import type {
    Answerer,
    CategorizedQuestions,
    CategorizedQuestionCounts,
  } from './types'

  export let allContributors: Map<string, Answerer>
  export let channels: string[]
  export let allQuestions: CategorizedQuestions
  export let memberCount: number
  export let name: string
  export let presenceCount: number

  let today = new Date()
  let endDate = today
  let startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1)
  let dates: Date[] = timeBetweenDates('months', [startDate, endDate])
  let filteredQuestions = filterQuestions(channels, dates, allQuestions)
  let filteredContributors = filterAnswers(channels, [dates[0], today], allContributors)

  const getBarData = (filteredQuestions: Map<string, CategorizedQuestionCounts>) => {
    const map = new Map(filteredQuestions)
    map.delete('aggregate')
    const values: Record<string, any>[] = []
    for (const [date, questionCategories] of map) {
      Object.entries(questionCategories).forEach(([category, count]) => {
        values.push({ group: category, key: date, value: count })
      })
    }
    return values
  }

  const getPieData = (questions: CategorizedQuestionCounts) => {
    const values: Record<string, any>[] = []
    Object.entries(questions).forEach(([category, count]) => {
      values.push({ group: category, count })
    })
    return values
  }

  const getTopContributors = (answers: Map<string, Answerer>, staff: boolean) => {
    let counts = Array.from(answers)
    //.filter(([id, user]) => staff ? user.isStaff : true)
    .map(([id, user]) => [`${user.discordUsername}${user.githubUsername}`, user.questions.length])
    .sort((prev, next) => next[1] - prev[1])
    .slice(0, 9)
    .map((contributor) => {return {id: contributor[0], name: contributor[0], answers: contributor[1]}})
    // console.log(counts)
    if(counts) return counts
    return []
  }

  let topOverall = getTopContributors(allContributors, false)
  let topStaff = getTopContributors(allContributors, true)

  $: filteredQuestions = filterQuestions(channels, dates, allQuestions)
  $: filteredContributors = filterAnswers(channels, [dates[0], today], allContributors)

  $: total = filteredQuestions.get('aggregate')?.total ?? ''
  $: unanswered = filteredQuestions.get('aggregate')?.unanswered ?? ''
  $: unansweredPct =
    total && unanswered
      ? `${Math.round((100 * parseInt(unanswered)) / parseInt(total))}%`
      : ''
  $: staff = filteredQuestions.get('aggregate')?.staff ?? ''
  $: staffPct =
    total && staff
      ? `${Math.round((100 * parseInt(staff)) / parseInt(total))}%`
      : ''
  $: community = filteredQuestions.get('aggregate')?.community ?? ''
  $: communityPct =
    total && staff
      ? `${Math.round((100 * parseInt(community)) / parseInt(total))}%`
      : ''

  $: barData = getBarData(filteredQuestions)
  $: pieData = getPieData(filteredQuestions.get('aggregate')!)
  /** @TODO filter by staff/contributor*/
  $: topStaff = getTopContributors(filteredContributors, true)
  $: topOverall = getTopContributors(filteredContributors, false)
</script>

<svelte:head>
  <title>{name} Discord Metrics Dashboard></title>
</svelte:head>

<Content>
  <Grid>
    <Row>
      <Column class="styled-row" style="background: rgb(15, 98, 254, 0.1);">
        <h1 class="number">
          {memberCount}
          <ArrowUp size="{32}" color="var(--cds-interactive-01, #0f62fe)" />
        </h1>
        <h4 class="number-text">Total Members</h4>
      </Column>
      <Column class="styled-row" style="background: rgb(0, 255, 0, 0.1);">
        <h1 class="number">
          {presenceCount}
          <Group size="{32}" color="green" />
        </h1>
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
        <h1 class="number">{total}</h1>
        <h4 class="number-text">Total Questions</h4>
      </Column>
      <Column
        class="split-counts"
        style="color: rgb(255, 153, 0); outline-width:0"
      >
        <h1 class="number">
          {staff}
          <Tag style="background-color:rgb(255, 153, 0, 0.6)">{staffPct}</Tag>
        </h1>
        <h4 class="number-text">Answered by Staff</h4>
      </Column>
      <Column class="split-counts" style="outline-color:rgb(15, 98, 254, 0.6)">
        <h1 class="number">
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
        <h1 class="number">
          {unanswered}
          <Tag style="background-color:rgb(255, 0, 0, 0.4)">{unansweredPct}</Tag
          >
        </h1>
        <h4 class="number-text">Unanswered</h4>
      </Column>
    </Row>
    <Row style="margin-top:16px">
      <Column sm="{3}" md="{6}" lg="{8}">
        <BarChartStacked
          bind:data="{barData}"
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
        /></Column
      >
      <Column sm="{1}" md="{2}" lg="{4}">
        <PieChart
          bind:data="{pieData}"
          options="{{
            title: 'Pie (value maps to count)',
            resizable: true,
            pie: {
              valueMapsTo: 'count',
            },
            height: '400px',
          }}"
        />
      </Column>
    </Row>
    <Row style="justify-content: center;" class="styled-row"
      ><h1 class="number-text">Top Contributors</h1></Row
    >
    <Row
      ><Column style="display: grid; justify-content:center">
        <Row
          ><h2>
            Overall <CaretUp
              style="vertical-align:bottom"
              color="green"
              size="{32}"
            />
          </h2></Row
        >
        <Row
          ><DataTable
            headers="{[
              { key: 'name', value: 'User' },
              { key: 'answers', value: 'Answers' },
            ]}"
            bind:rows="{topOverall}"
          /></Row
        >
      </Column>
      <Column style="display: grid; justify-content:center"
        ><Row
          ><h2>
            Staff <CaretUp
              style="vertical-align:bottom"
              color="rgb(255, 153, 0, 0.6)"
              size="{32}"
            />
          </h2></Row
        >
        <Row
          ><DataTable
            headers="{[
              { key: 'name', value: 'User' },
              { key: 'answers', value: 'Answers' },
            ]}"
            bind:rows="{topStaff}"
          /></Row
        ></Column
      ></Row
    >
  </Grid>
</Content>

<style>
  :global(.styled-row) {
    flex-direction: row;
    position: relative;
    left: unset;
    bottom: unset;
    right: unset;
    margin: 6px;
    padding: 12px;
    border-radius: 10px;
  }
  /* :global(.members-count) {
    flex-direction: row;
    position: relative;
    left: unset;
    bottom: unset;
    right: unset;
    margin: 6px;
    padding: 12px;
    border-radius: 10px;
  } */

  :global(.number-text) {
    font-weight: lighter;
  }

  :global(.number) {
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
