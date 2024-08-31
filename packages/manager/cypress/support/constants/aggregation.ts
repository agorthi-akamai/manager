
export enum aggregation {
  Min = 'min',
  Max = 'max',
  Avg = 'avg',
  Sum = 'sum',
}

export const aggregationConfig = {
  basic: [aggregation.Max, aggregation.Min, aggregation.Avg],
  all: [aggregation.Max, aggregation.Min, aggregation.Avg, aggregation.Sum],
};