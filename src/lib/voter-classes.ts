export const voterClassValues = [
  "CE_1",
  "CE_2",
  "CE_3",
  "CE_4",
  "CY_1",
  "CY_2",
  "CY_3",
  "CY_4",
  "IS_1",
  "IS_2",
  "IS_3",
  "IS_4",
  "ROBOTICS_1",
  "ROBOTICS_2",
  "ROBOTICS_3",
  "ROBOTICS_4",
] as const;

export const voterClasses = [
  { value: "CE_1", label: "CE 1" },
  { value: "CE_2", label: "CE 2" },
  { value: "CE_3", label: "CE 3" },
  { value: "CE_4", label: "CE 4" },
  { value: "CY_1", label: "CY 1" },
  { value: "CY_2", label: "CY 2" },
  { value: "CY_3", label: "CY 3" },
  { value: "CY_4", label: "CY 4" },
  { value: "IS_1", label: "IS 1" },
  { value: "IS_2", label: "IS 2" },
  { value: "IS_3", label: "IS 3" },
  { value: "IS_4", label: "IS 4" },
  { value: "ROBOTICS_1", label: "Robotics 1" },
  { value: "ROBOTICS_2", label: "Robotics 2" },
  { value: "ROBOTICS_3", label: "Robotics 3" },
  { value: "ROBOTICS_4", label: "Robotics 4" },
] as const;

export type VoterClass = (typeof voterClassValues)[number];

const classLabels = new Map<string, string>(voterClasses.map(({ value, label }) => [value, label]));

export function voterClassLabel(value: string) {
  return classLabels.get(value) ?? "Unassigned";
}
