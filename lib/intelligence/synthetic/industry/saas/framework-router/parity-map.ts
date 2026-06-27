import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";


export const ASC_IFRS_SAAS_PARITY_MAP: Array<{ asc: string; ifrs: string; switchPointId: string }> = [
  { asc: "ASC.606-10-25-27", ifrs: "IFRS15.Para35-37", switchPointId: "SP-1" },
  { asc: "ASC.606-10-25-19", ifrs: "IFRS15.Para35-37", switchPointId: "SP-2" },
  { asc: "ASC.350-40-25-1", ifrs: "IAS38.Page", switchPointId: "SP-3" },
  { asc: "ASC.985-20-25-2", ifrs: "IFRIC.Apr2021.SaaS", switchPointId: "SP-4" },
  { asc: "ASC.606-10-25-1", ifrs: "IFRIC.Apr2021.SaaS", switchPointId: "SP-5" },
];

