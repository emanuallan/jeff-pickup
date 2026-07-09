import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { PhoneInput } from './phone-input'

const US_NATIONAL = '2025550101'
const US_E164 = `1${US_NATIONAL}`

function ControlledPhoneInput() {
  const [value, setValue] = useState('')
  return <PhoneInput value={value} onChange={setValue} />
}

afterEach(() => {
  cleanup()
})

describe('PhoneInput', () => {
  it('renders US placeholder and empty hidden value', () => {
    render(<PhoneInput />)

    expect(screen.getByRole('textbox', { name: /phone number/i })).toHaveAttribute(
      'placeholder',
      '(555) 123-4567',
    )
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe('')
  })

  it('formats US digits while typing and updates hidden E.164', async () => {
    const user = userEvent.setup()
    render(<PhoneInput />)

    const input = screen.getByRole('textbox', { name: /phone number/i })
    await user.type(input, US_NATIONAL)

    expect(input).toHaveValue('(202) 555-0101')
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe(US_E164)
  })

  it('accepts a pasted formatted US number', async () => {
    const user = userEvent.setup()
    render(<PhoneInput />)

    const input = screen.getByRole('textbox', { name: /phone number/i })
    await user.click(input)
    await user.paste('(202) 555-0101')

    expect(input).toHaveValue('(202) 555-0101')
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe(US_E164)
  })

  it('handles a mistaken leading 1 while typing a US number', async () => {
    const user = userEvent.setup()
    render(<PhoneInput />)

    const input = screen.getByRole('textbox', { name: /phone number/i })
    await user.type(input, '12025550101')

    expect(input).toHaveValue('(202) 555-0101')
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe(US_E164)
  })

  it('ignores a lone 1 keystroke when +1 is already selected', async () => {
    const user = userEvent.setup()
    render(<PhoneInput />)

    const input = screen.getByRole('textbox', { name: /phone number/i })
    await user.type(input, '1')
    expect(input).toHaveValue('')
    await user.type(input, '2025550101')
    expect(input).toHaveValue('(202) 555-0101')
  })

  it('strips a pasted leading +1 for US', async () => {
    const user = userEvent.setup()
    render(<PhoneInput />)

    const input = screen.getByRole('textbox', { name: /phone number/i })
    await user.click(input)
    await user.paste('+1 202 555 0101')

    expect(input).toHaveValue('(202) 555-0101')
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe(US_E164)
  })

  it('removes a digit when backspacing through formatting', async () => {
    const user = userEvent.setup()
    render(<PhoneInput />)

    const input = screen.getByRole('textbox', { name: /phone number/i })
    await user.type(input, '202')
    expect(input).toHaveValue('(202)')

    await user.keyboard('{Backspace}')
    expect(input).toHaveValue('(20')
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe('120')
  })

  it('caps pasted overflow for US instead of switching country', async () => {
    const user = userEvent.setup()
    render(<PhoneInput />)

    const input = screen.getByRole('textbox', { name: /phone number/i })
    await user.click(input)
    await user.paste('447911123456')

    expect(screen.getByRole('combobox', { name: /country code/i })).toHaveValue('US')
    expect(input).toHaveValue('(447) 911-1234')
    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe(
      '14479111234',
    )
  })

  it('calls onChange with E.164 in controlled mode', async () => {
    const user = userEvent.setup()
    render(<ControlledPhoneInput />)

    await user.type(screen.getByRole('textbox', { name: /phone number/i }), US_NATIONAL)

    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe(US_E164)
  })

  it('hydrates controlled value from stored E.164', () => {
    render(<PhoneInput value={US_E164} onChange={() => {}} />)

    expect(screen.getByRole('textbox', { name: /phone number/i })).toHaveValue('(202) 555-0101')
    expect(screen.getByRole('combobox', { name: /country code/i })).toHaveValue('US')
  })

  it('updates hidden value when country changes', async () => {
    const user = userEvent.setup()
    render(<PhoneInput />)

    const input = screen.getByRole('textbox', { name: /phone number/i })
    await user.type(input, '8095551234')

    await user.selectOptions(screen.getByRole('combobox', { name: /country code/i }), 'DO')

    expect(document.querySelector<HTMLInputElement>('input[name="phone"]')?.value).toBe(
      '18095551234',
    )
  })
})
