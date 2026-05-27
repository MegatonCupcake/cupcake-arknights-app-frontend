import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { OperatorApi, OperatorResponse, OperatorSearchRequest } from './operator-api';

describe('App', () => {
  let api: MockOperatorApi;

  beforeEach(async () => {
    api = new MockOperatorApi();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideNoopAnimations(),
        {
          provide: OperatorApi,
          useValue: api,
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => overlay.remove());
  });

  it('renders CSV-derived filter sections and slim operator cards', async () => {
    const fixture = TestBed.createComponent(App);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Filter operators');
    expect([...compiled.querySelectorAll('.section-button')].some((button) => button.textContent?.includes('Skill Type'))).toBe(
      true,
    );
    expect(compiled.querySelector('img')?.getAttribute('src')).toBe(
      'operator_thumbnails/Blaze_the_Igniting_Spark.png',
    );
    expect(compiled.textContent).toContain('★★★★★★');
    expect(compiled.textContent).toContain('Caster | Primal');
    expect(compiled.textContent).toContain('Skill Type: Auto Recovery');
    expect(api.calls[0].size).toBe(10);
  });

  it('stages filter changes in the Material dialog and searches on close', async () => {
    const fixture = TestBed.createComponent(App);

    await fixture.whenStable();
    fixture.detectChanges();

    openSection(fixture.nativeElement, 'Class');
    fixture.detectChanges();
    await fixture.whenStable();

    clickDialogButton('Caster');
    fixture.detectChanges();

    expect(api.calls.length).toBe(1);

    clickDialogButton('x');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.calls.at(-1)?.predicates).toEqual([
      { group: 'and', field: 'class', operator: 'eq', value: 'Caster' },
    ]);
  });

  it('emits include-all, exclude, skill type, and sort selections from dialogs', async () => {
    const fixture = TestBed.createComponent(App);

    await fixture.whenStable();
    fixture.detectChanges();

    openSection(fixture.nativeElement, 'Rarity');
    fixture.detectChanges();
    await fixture.whenStable();
    clickDialogRadio('include all');
    clickDialogButton('5');
    clickDialogButton('6');
    clickDialogButton('ascending');
    clickDialogButton('x');
    fixture.detectChanges();
    await fixture.whenStable();

    openSection(fixture.nativeElement, 'Skill Type');
    fixture.detectChanges();
    await fixture.whenStable();
    clickDialogButton('Auto Recovery');
    clickDialogButton('Offensive Recovery');
    clickDialogButton('x');
    fixture.detectChanges();
    await fixture.whenStable();

    openSection(fixture.nativeElement, 'Status');
    fixture.detectChanges();
    await fixture.whenStable();
    const statusDialog = document.body.querySelector('.mat-mdc-dialog-container') as HTMLElement;
    const excludeSection = [...statusDialog.querySelectorAll('.filter-dialog__section')].find((section) =>
      section.textContent?.includes('Exclude'),
    ) as HTMLElement;
    clickButton(excludeSection, 'stun');
    clickDialogButton('x');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.calls.at(-1)?.predicates).toEqual([
      { group: 'and', field: 'rarity', operator: 'eq', value: '5' },
      { group: 'and', field: 'rarity', operator: 'eq', value: '6' },
      { group: 'and', field: 'skill_type', operator: 'in', value: 'Auto Recovery|Offensive Recovery' },
      { group: 'not', field: 'status', operator: 'eq', value: 'stun' },
    ]);
    expect(api.calls.at(-1)?.sorts[0]).toEqual({ field: 'rarity', direction: 'asc' });
  });

  it('expands and hides card metadata', async () => {
    const fixture = TestBed.createComponent(App);

    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).not.toContain('Tag: burst');
    clickButton(compiled, 'expand');
    fixture.detectChanges();

    expect(compiled.textContent).toContain('Tag: burst');
    expect(compiled.textContent).not.toContain('Release:');
    expect(compiled.textContent).not.toContain('Birthday:');
    expect(compiled.textContent).not.toContain('Origin:');
    expect(compiled.textContent).not.toContain('Height:');
    expect(compiled.textContent).toContain('hide');
  });
});

function openSection(root: HTMLElement, label: string): void {
  clickButton(root, label);
}

function clickDialogButton(label: string): void {
  clickButton(document.body, label);
}

function clickDialogRadio(label: string): void {
  const radio = [...document.body.querySelectorAll('mat-radio-button')].find((candidate) =>
    candidate.textContent?.trim().includes(label),
  ) as HTMLElement | undefined;

  radio?.click();
}

function clickButton(root: ParentNode, label: string): void {
  const button = [...root.querySelectorAll('button')].find((candidate) =>
    candidate.textContent?.trim().includes(label),
  ) as HTMLButtonElement | undefined;

  button?.click();
}

class MockOperatorApi {
  readonly calls: OperatorSearchRequest[] = [];

  search(request: OperatorSearchRequest) {
    this.calls.push(request);
    return of(exampleResponse);
  }
}

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
    totalPages: 5,
    first: true,
    last: false,
    sort: ['rarity,desc', 'name,asc'],
  },
};
