import { Resend } from 'resend'

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  return new Resend(key)
}

function fromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Organizr <onboarding@resend.dev>'
  )
}

export type SendParticipantOtpEmailResult =
  | { ok: true }
  | { ok: false; error: string }

/** Send a 6-digit participant claim/recover code via Resend. */
export async function sendParticipantOtpEmail(opts: {
  to: string
  code: string
  orgName: string
  purpose: 'claim' | 'recover' | 'bind'
}): Promise<SendParticipantOtpEmailResult> {
  const client = getResendClient()
  if (!client) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'Email delivery is not configured.' }
    }
    console.info(
      `[participant-otp] RESEND_API_KEY missing — code for ${opts.to}: ${opts.code}`,
    )
    return { ok: true }
  }

  const action =
    opts.purpose === 'recover'
      ? 'sign back in'
      : opts.purpose === 'bind'
        ? 'link this email to your account'
        : 'finish signing up'

  const { error } = await client.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `${opts.code} is your ${opts.orgName} code`,
    text: [
      `Your code for ${opts.orgName} is ${opts.code}.`,
      '',
      `Use it to ${action}. It expires in 10 minutes.`,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  })

  if (error) {
    console.error('participant otp email failed', error)
    return { ok: false, error: 'Could not send the verification email.' }
  }

  return { ok: true }
}
