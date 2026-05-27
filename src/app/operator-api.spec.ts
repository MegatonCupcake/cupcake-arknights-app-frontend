import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OperatorApi, OperatorResponse } from './operator-api';

describe('OperatorApi', () => {
  let api: OperatorApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OperatorApi, provideHttpClient(), provideHttpClientTesting()],
    });

    api = TestBed.inject(OperatorApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('serializes pagination, repeated sorting, and predicate params', () => {
    api
      .search({
        page: 2,
        size: 20,
        sorts: [
          { field: 'rarity', direction: 'desc' },
          { field: 'name', direction: 'asc' },
        ],
        predicates: [
          { group: 'and', field: 'class', operator: 'eq', value: 'Caster' },
          { group: 'and', field: 'rarity', operator: 'eq', value: '5' },
          { group: 'and', field: 'rarity', operator: 'eq', value: '6' },
          { group: 'and', field: 'skill_type', operator: 'in', value: 'Auto Recovery|Manual' },
          { group: 'and', field: 'faction', operator: 'eq', value: 'Rhodes Island' },
          { group: 'not', field: 'status', operator: 'eq', value: 'stun' },
        ],
      })
      .subscribe((response) => {
        expect(response.operators[0].name).toBe('Blaze the Igniting Spark');
        expect(response.page.totalElements).toBe(45);
      });

    const request = http.expectOne((candidate) => candidate.url.endsWith('/api/operators'));

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.getAll('sort')).toEqual(['rarity,desc', 'name,asc']);
    expect(request.request.params.getAll('and')).toEqual([
      'class:eq:Caster',
      'rarity:eq:5',
      'rarity:eq:6',
      'skill_type:in:Auto Recovery|Manual',
      'faction:eq:Rhodes Island',
    ]);
    expect(request.request.params.getAll('or')).toEqual([]);
    expect(request.request.params.getAll('not')).toEqual(['status:eq:stun']);

    request.flush(exampleResponse);
  });
});

const exampleResponse: OperatorResponse = {
  operators: [
    {
      id: 49,
      name: 'Blaze the Igniting Spark',
      release_order: 49,
      rarity: 6,
      class: 'Caster',
      branch: 'Primal',
      gender: 'Female',
      position: 'Ranged',
      birthday_month: 'March',
      date_of_birth: 'March 24th',
      infection_status: 'infected',
      obtain_method: 'Standard Headhunting',
      combat_experience: '14 years',
      place_of_birth: 'Yan',
      height: '172 cm',
      thumbnail: 'operator_thumbnails/Blaze_the_Igniting_Spark.png',
      races: ['Feline'],
      factions: ['Rhodes Island', 'Elite Op'],
      sub_factions: ['Yan , Victoria'],
      damage_types: ['Burn', 'Elemental', 'Arts'],
      illustrators: ['Mag42'],
      obtain_methods: ['Recruitment', 'Story_Progress'],
      skill_types: ['Auto Recovery', 'Manual'],
      tags: ['atk_buff', 'burst'],
      statuses: [],
      elemental_afflictions: ['burn'],
    },
  ],
  page: {
    number: 0,
    size: 10,
    totalElements: 45,
    totalPages: 3,
    first: true,
    last: false,
    sort: ['rarity,desc', 'name,asc'],
  },
};
