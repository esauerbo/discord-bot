<script lang="ts">
  import {
    Content,
    Grid,
    Row,
    Column,
    DatePicker,
    DatePickerInput,
  } from 'carbon-components-svelte'

  let today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
 // const getDaysBetween = ()
  let currentDate = firstOfMonth

  const onDateChange = (d: CustomEvent) => {
    console.log(d.detail.selectedDates[0])
    console.log(d.detail.selectedDates[0].toLocaleDateString())
    currentDate = d.detail.selectedDates[0]
  }
    


  $: dateLabel = `${currentDate} - ${today.toLocaleDateString()} ()`
</script>

<Content>
  <Grid>
    <Row>
      <Column>
        <DatePicker
          datePickerType="single"
          maxDate="{today}"
          on:change="{onDateChange}"
          value="{currentDate.toLocaleDateString()}"
        >
          <DatePickerInput labelText="Starting at" placeholder="mm/dd/yyyy" helperText={dateLabel}/>
        </DatePicker>
      </Column>
    </Row>
  </Grid>
</Content>
