
export enum aggregation {
  Min = 'min',
  Max = 'max',
  Avg = 'avg',
  Sum = 'sum',
}

export const aggregationConfig = {
  basic: [aggregation.Avg, aggregation.Max, aggregation.Min],
  all: [aggregation.Avg, aggregation.Max, aggregation.Min, aggregation.Sum],
};