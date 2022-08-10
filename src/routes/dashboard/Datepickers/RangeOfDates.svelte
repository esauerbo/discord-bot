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

  /** rounds start date UP to the next whole week, month, or year */
  function roundStartDate(unit: string, start: Date): void {
    switch (unit) {
      case 'days':
        return
      case 'weeks':
        if (start.getDay() < 1) {
          start.setDate(start.getDate() + 1)
        } else if (start.getDay() !== 1) {
          start.setDate(start.getDate() + (7 - start.getDay()))
        }
        return
      case 'months':
        if (start.getDate() !== 1) {
          start.setDate(1)
          start.setMonth(start.getMonth() + 1)
        }
        return
      case 'years':
        if (start.getMonth() !== 0 || start.getDate() !== 1) {
          start.setDate(1)
          start.setMonth(0)
          start.setFullYear(start.getFullYear() + 1)
        }
        return
      default:
        return
    }
  }

  function incrementDate(unit: string, start: Date) {
    switch (unit) {
      case 'days':
        start.setDate(start.getDate() + 1)
        return
      case 'weeks':
        start.setDate(start.getDate() + 7)
        return
      case 'months':
        start.setMonth(start.getMonth() + 1)
        return
      case 'years':
        start.setFullYear(start.getFullYear() + 1)
        return
      default:
        return
    }
  }

  const timeBetween = function (unit: string) {
    let dates = []
    let start = new Date(startDate)
    roundStartDate(unit, start)
    while (start <= endDate) {
      dates.push(start.toISOString())
      incrementDate(unit, start)
    }
    return dates
  }

  const onDateChange = (d: CustomEvent) => {
    startDate = d.detail.selectedDates[0]
    endDate = d.detail.selectedDates[1]
    dates = timeBetween(frequency)
  }

  const frequencyItems = [
    { id: '0', text: 'Daily', disabled: false, value: 'days' },
    { id: '1', text: 'Weekly', disabled: false, value: 'weeks' },
    { id: '2', text: 'Monthly', disabled: false, value: 'months' },
    { id: '3', text: 'Yearly', disabled: false, value: 'years' },
  ]
  let frequency_selectedId = '2'

  let today = new Date()
  let endDate = today
  let startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1)

  const frequencyText = () => 
    dates.length === 1 ? frequency.slice(0, -1) : frequency

  $: dateRangeLabel = `${startDate.toLocaleDateString()} - ${today.toLocaleDateString()}`
  $: numLabel = `${dates.length} ${frequencyText()} (including this ${frequency.slice(0, -1)})`
  $: frequency =
    frequencyItems.find((item) => item.id === frequency_selectedId)?.value ?? ''
  $: dates = timeBetween(frequency)

</script>

<Content>
  <Grid>
    <Row>
      <Column>
        <Dropdown
          type="inline"
          titleText="Frequency"
          bind:selectedId="{frequency_selectedId}"
          items="{frequencyItems}"
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
          <DatePickerInput
            labelText="Start date"
            placeholder="mm/dd/yyyy"
            helperText="{dateRangeLabel}"
          />
          <DatePickerInput
            labelText="End date"
            placeholder="mm/dd/yyyy"
            helperText="{numLabel}"
          />
        </DatePicker>
      </Column>
    </Row>
  </Grid>
</Content>
