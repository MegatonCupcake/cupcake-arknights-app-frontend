import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export type PredicateGroup = 'and' | 'or' | 'not';
export type PredicateOperator = 'eq' | 'contains' | 'in';
export type SortDirection = 'asc' | 'desc';

export type FilterKey =
  | 'class'
  | 'branch'
  | 'position'
  | 'rarity'
  | 'gender'
  | 'infection_status'
  | 'obtain_method'
  | 'skill_type'
  | 'race'
  | 'faction'
  | 'sub_faction'
  | 'damage_type'
  | 'illustrator'
  | 'tag'
  | 'status'
  | 'elemental_affliction';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterSection {
  key: FilterKey;
  field: string;
  label: string;
  options: FilterOption[];
}

export interface FilterSelection {
  includeMode: Extract<PredicateGroup, 'and' | 'or'>;
  includeValues: string[];
  excludeValues: string[];
}

export interface PredicateFilter {
  group: PredicateGroup;
  field: string;
  operator: PredicateOperator;
  value: string;
}

export interface SortSpec {
  field: string;
  direction: SortDirection;
}

export interface OperatorRecord {
  id: number;
  name: string;
  release_order?: number;
  rarity?: number;
  class?: string;
  branch?: string;
  gender?: string;
  position?: string;
  birthday_month?: string;
  date_of_birth?: string;
  infection_status?: string;
  obtain_method?: string;
  combat_experience?: string;
  place_of_birth?: string;
  height?: string;
  physical_strength?: string;
  mobility?: string;
  endurance?: string;
  tactical_acumen?: string;
  combat_skill?: string;
  originium_arts_assimilation?: string;
  thumbnail?: string;
  races?: string[];
  factions?: string[];
  sub_factions?: string[];
  damage_types?: string[];
  illustrators?: string[];
  obtain_methods?: string[];
  skill_types?: string[];
  tags?: string[];
  statuses?: string[];
  elemental_afflictions?: string[];
  [key: string]: unknown;
}

export interface OperatorPageMetadata {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  sort: string[];
}

export interface OperatorResponse {
  operators: OperatorRecord[];
  page: OperatorPageMetadata;
}

export interface OperatorSearchRequest {
  page: number;
  size: number;
  sorts: SortSpec[];
  predicates: PredicateFilter[];
}

@Injectable({ providedIn: 'root' })
export class OperatorApi {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiBaseUrl}/api/operators`;

  search(request: OperatorSearchRequest): Observable<OperatorResponse> {
    let params = new HttpParams().set('page', request.page).set('size', request.size);

    for (const sort of request.sorts) {
      params = params.append('sort', `${sort.field},${sort.direction}`);
    }

    for (const predicate of request.predicates) {
      params = params.append(
        predicate.group,
        `${predicate.field}:${predicate.operator}:${predicate.value}`,
      );
    }

    return this.http.get<OperatorResponse>(this.endpoint, { params });
  }
}
