<script lang="ts">
  import {
    Content,
    Grid,
    Row,
    Column,
    DatePicker,
    DatePickerInput,
    Dropdown,
  } from 'carbon-components-svelte'
  import { timeBetweenDates } from './applyFilter'

  export let dates: Date[]
  export let today: Date
  export let startDate: Date
  export let endDate: Date

  const onDateChange = (d: CustomEvent) => {
    startDate =  d.detail.selectedDates[0]
    endDate =  d.detail.selectedDates[1]
    dates = timeBetweenDates(frequency, d.detail.selectedDates)
  }

  const dropdownItems = [
    { id: '0', text: 'Daily', disabled: false, value: 'days' },
    { id: '1', text: 'Weekly', disabled: false, value: 'weeks' },
    { id: '2', text: 'Monthly', disabled: false, value: 'months' },
    { id: '3', text: 'Yearly', disabled: false, value: 'years' },
  ]
  let dropdown_selectedId = '2'

  const frequencySpelling = () =>
    dates.length === 1 ? frequency.slice(0, -1) : frequency

  $: label = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}: ${ dates.length} ${frequencySpelling()}`
  $: frequency =
    dropdownItems.find((item) => item.id === dropdown_selectedId)?.value ?? ''
  $: dates = timeBetweenDates(frequency, [startDate, endDate])
</script>

<Content>
  <Grid>
    <Row>
      <Column>
        <Dropdown
          type="inline"
          titleText="Frequency"
          bind:selectedId="{dropdown_selectedId}"
          items="{dropdownItems}"
        />
      </Column>
      <Column>
        <DatePicker
          datePickerType="range"
          maxDate="{today}"
          on:change="{onDateChange}"
          valueFrom="{startDate.toLocaleDateString()}"
          valueTo="{endDate.toLocaleDateString()}"
        >
          <DatePickerInput labelText="Start date" placeholder="mm/dd/yyyy" helperText="{label}"/>
          <DatePickerInput labelText="End date" placeholder="mm/dd/yyyy" />
        </DatePicker>
      </Column>
    </Row>
  </Grid>
</Content>
