'use client';

import qs from 'qs';
import { useRouter } from 'next/navigation';
import { useSearchParams as useNavigation } from 'next/navigation';
import { format, parseISO, startOfMonth, endOfMonth } from '@workspace/utils/date';

interface DateRange {
  from?: Date;
  to?: Date;
}

interface Props {
  range?: DateRange;
}

interface DateParams {
  gte?: string;
  lte?: string;
  gt?: string;
  lt?: string;
}

interface SearchParams {
  date?: DateParams | string;
  page?: number;
  pageSize?: number;
  q?: string;
  [key: string]: any;
}

interface UseSearchParamsReturn {
  q: string;
  params: SearchParams;
  searchParams: SearchParams;
  setDateRangeParams: (params: { range: DateRange }, resetPage?: boolean) => void;
  setParams: (newParams: Record<string, any>, resetPage?: boolean) => void;
  range: {
    from: string;
    to: string;
    _from: Date;
    _to: Date;
  };
}

export const useSearchParams = ({ range = {} }: Props = {}): UseSearchParamsReturn => {
  const router = useRouter();
  const searchParams = useNavigation();

  const params: SearchParams = qs.parse(searchParams.toString(), {
    ignoreQueryPrefix: true,
  });

  const setParams = (newParams: Record<string, any>, resetPage: boolean = true): void => {
    const qsParams = qs.stringify(
      {
        ...params,
        ...newParams,
        page: resetPage ? 1 : params.page,
      },
      { encode: false }
    );

    router.replace(`?${qsParams}`);
  };

  const setDateRangeParams = ({ range }: { range: DateRange }, resetPage: boolean = true): void => {
    const { from, to } = range;
    if (from && to) {
      setParams({ date: { gte: format(from, 'yyyy-MM-dd'), lte: format(to, 'yyyy-MM-dd') } }, resetPage);
    }
  };

  const dateParam = params?.date;
  const getFromValue = (param: string | DateParams | undefined, fallback: string): string => {
    if (typeof param === 'string') return param;
    if (typeof param === 'object' && param !== null) {
      return param.gte || param.gt || fallback;
    }
    return fallback;
  };

  const getToValue = (param: string | DateParams | undefined, fallback: string): string => {
    if (typeof param === 'string') return param;
    if (typeof param === 'object' && param !== null) {
      return param.lte || param.lt || fallback;
    }
    return fallback;
  };

  const from = getFromValue(dateParam, range.from ? format(range.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const to = getToValue(dateParam, range.to ? format(range.to, 'yyyy-MM-dd') : format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  return {
    q: qs.stringify(params, { encode: false }),
    params,
    searchParams: params,
    setDateRangeParams,
    setParams,
    range: { from, to, _from: parseISO(from), _to: parseISO(to) },
  };
};

export default useSearchParams;
