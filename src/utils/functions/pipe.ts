/* deno-fmt-ignore-file */
export function pipe<T1>(value: T1): T1;
export function pipe<T1, T2>(value: T1, fn1: (value: T1) => T2): T2;
export function pipe<T1, T2, T3>(value: T1, fn1: (value: T1) => T2, fn2: (value: T2) => T3): T3;
export function pipe<T1, T2, T3, T4>(value: T1, fn1: (value: T1) => T2, fn2: (value: T2) => T3, fn3: (value: T3) => T4): T4;
export function pipe<T1, T2, T3, T4, T5>(value: T1, fn1: (value: T1) => T2, fn2: (value: T2) => T3, fn3: (value: T3) => T4, fn4: (value: T4) => T5): T5;
export function pipe<T1, T2, T3, T4, T5, T6>(value: T1, fn1: (value: T1) => T2, fn2: (value: T2) => T3, fn3: (value: T3) => T4, fn4: (value: T4) => T5, fn5: (value: T5) => T6): T6;
export function pipe<T1, T2, T3, T4, T5, T6, T7>(value: T1, fn1: (value: T1) => T2, fn2: (value: T2) => T3, fn3: (value: T3) => T4, fn4: (value: T4) => T5, fn5: (value: T5) => T6, fn6: (value: T6) => T7): T7;

export function pipe(value: any, ...fns: ((value: any) => any)[]): any {
  return fns.reduce((v, fn) => fn(v), value);
}
