import { ReadResourceResult } from '@modelcontextprotocol/sdk/types.js'
import { FinishKit } from '@finishkit/sdk'

export async function readRunFindingsResource(
  fk: FinishKit,
  runId: string,
): Promise<ReadResourceResult> {
  const outcomes = await fk.runs.outcomes(runId)

  return {
    contents: [
      {
        uri: `finishkit://runs/${runId}/findings`,
        mimeType: 'application/json',
        text: JSON.stringify(outcomes.findings, null, 2),
      },
    ],
  }
}

export async function readRunEventsResource(
  fk: FinishKit,
  runId: string,
): Promise<ReadResourceResult> {
  const response = await fk.runs.events(runId)

  return {
    contents: [
      {
        uri: `finishkit://runs/${runId}/events`,
        mimeType: 'application/json',
        text: JSON.stringify(response.events, null, 2),
      },
    ],
  }
}
