declare module 'incur' {
  interface Register {
    commands: {
      'configure': { args: {}; options: { chain: string; dialog: string; createAccount: boolean; call: string[]; spendLimit: number; spendPeriod: "minute" | "hour" | "day" | "week" | "month" | "year"; expiry: number; spendToken: string; feeLimit: number } }
      'sign': { args: {}; options: { calls: string; chain: string; address: string } }
      'status': { args: {}; options: { address: string; chain: string } }
    }
  }
}
