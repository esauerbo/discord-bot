<script lang="ts">
  import {
    Content,
    Grid,
    Row,
    Column,
    Dropdown,
    NumberInput,
  } from 'carbon-components-svelte'

  const frequencyItems = [
    { id: '0', text: 'Days' },
    { id: '1', text: 'Weeks' },
    { id: '2', text: 'Months' },
    { id: '3', text: 'Years' },
  ]

  let frequency_selectedId = '2'
  let count = 1

  const formatRelative = (count: number, id: string) => {
    const frequency = frequencyItems.find((item) => item.id === id)?.text ?? ''
    const singular = frequency.slice(0, -1).toLowerCase()
    const plural = frequency.toLowerCase()
    if (frequency !== 'Days') {
      return count === 1
        ? { label: `this ${singular}`, helperText: `` }
        : {
            label: `last`,
            helperText: `${plural} (including this ${singular})`,
          }
    }
    return count === 1
      ? { label: `today`, helperText: `` }
      : { label: `last`, helperText: `${plural} (including today)` }
  }

  $: relativeLabel = formatRelative(count, frequency_selectedId)
</script>

<Content>
  <Grid>
    <Row>
      <Column>
        <Dropdown
          titleText="Frequency"
          bind:selectedId="{frequency_selectedId}"
          items="{frequencyItems}"
        />
      </Column>
      <Column>
        <NumberInput
          min="{1}"
          label="{relativeLabel.label}"
          bind:value="{count}"
          helperText="{relativeLabel.helperText}"
        />
      </Column>
    </Row>
  </Grid>
</Content>