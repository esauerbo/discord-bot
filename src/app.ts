#!/usr/bin/env node
import 'source-map-support/register'
import { App } from '@aws-cdk/core'
import { DiscordBotStack } from './stack'

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
}

const app = new App()
new DiscordBotStack(app, 'DiscordBotStack', { env })
