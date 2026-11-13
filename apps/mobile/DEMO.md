Open the phone app, choose Resident or Guard, and tap **Try demo**. No account or API connection is needed. The same screens used by real societies show fictional Green Valley Society data. **Open my society** enters the existing live login and offline sync flow.

As Resident, approve a visitor for A-101, raise a maintenance ticket, read a notice, add a vehicle or manage house help. Switch to Guard using the controls at the bottom of any screen to check approved visitors in and out. Guest code `DEMO01` and vehicle `DEMO2000` are ready to try. A newly generated resident guest code can also be redeemed in Guard mode on the same device.

Role switches keep changes in the same sandbox. Reset, Exit and a full app restart discard them. Backgrounding the app keeps the demo while its process remains alive. Demo records and query caches stay in memory, with no AsyncStorage persister. Requests capture their own demo client, and ending or resetting a session disables its old client. The live cache and queued visitor registrations retain their existing storage and replay behavior.

The demo simulates one device. It does not send notifications or messages, take payments, or synchronize with another phone or the web demo. The gate offers a sample guest pass so trying the flow does not require camera access.

Run `pnpm --filter @opensociety/mobile test` for the visitor, contract and session isolation checks. `pnpm --filter @opensociety/shared build` prepares the shared fixtures; `pnpm --filter @opensociety/mobile exec expo export --platform all` checks web, iOS and Android bundles. A native smoke check still needs an Expo development build or a compatible Expo Go installation.
