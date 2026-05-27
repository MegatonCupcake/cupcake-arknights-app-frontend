import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { FILTER_SECTIONS } from './filter-options';
import {
  FilterKey,
  FilterSection,
  FilterSelection,
  OperatorApi,
  OperatorRecord,
  OperatorResponse,
  PredicateFilter,
  SortDirection,
  SortSpec,
} from './operator-api';

type IncludeMode = FilterSelection['includeMode'];
type SortMenuValue = SortDirection | 'none';

interface FilterDialogData {
  section: FilterSection;
  selection: FilterSelection;
  sortDirection: SortMenuValue;
}

interface FilterDialogResult {
  section: FilterSection;
  selection: FilterSelection;
  sortDirection: SortMenuValue;
}

interface MetadataPill {
  label: string;
  value: string;
}

@Component({
  selector: 'app-filter-dialog',
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatRadioModule],
  template: `
    <header class="filter-dialog__header">
      <h2 mat-dialog-title>{{ data.section.label }} Filter</h2>
      <button type="button" mat-button class="dialog-close" (click)="closeWithState()">x</button>
    </header>

    <mat-dialog-content class="filter-dialog">
      <section class="filter-dialog__section">
        <div class="filter-dialog__row">
          <h3>Include</h3>
          <mat-radio-group [(ngModel)]="includeMode" aria-label="Include mode">
            <mat-radio-button value="or">includes</mat-radio-button>
            <mat-radio-button value="and">include all</mat-radio-button>
          </mat-radio-group>
        </div>

        <div class="option-grid">
          @for (option of data.section.options; track option.value) {
            <button
              type="button"
              mat-stroked-button
              class="option-button"
              [class.option-button--active]="includeValues.includes(option.value)"
              [attr.aria-pressed]="includeValues.includes(option.value)"
              (click)="toggleInclude(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      </section>

      <section class="filter-dialog__section">
        <div class="filter-dialog__row">
          <h3>Exclude</h3>
        </div>

        <div class="option-grid">
          @for (option of data.section.options; track option.value) {
            <button
              type="button"
              mat-stroked-button
              class="option-button"
              [class.option-button--excluded]="excludeValues.includes(option.value)"
              [attr.aria-pressed]="excludeValues.includes(option.value)"
              (click)="toggleExclude(option.value)"
            >
              {{ option.label }}
            </button>
          }
        </div>
      </section>

      <section class="filter-dialog__section">
        <div class="filter-dialog__row">
          <h3>Sort</h3>
        </div>

        <mat-radio-group class="sort-options" [(ngModel)]="sortDirection" aria-label="Sort direction">
          <mat-radio-button value="none">none</mat-radio-button>
          <mat-radio-button value="asc">ascending</mat-radio-button>
          <mat-radio-button value="desc">descending</mat-radio-button>
        </mat-radio-group>
      </section>
    </mat-dialog-content>
  `,
  styleUrl: './app.scss',
})
export class FilterDialog {
  protected readonly data = inject<FilterDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<FilterDialog, FilterDialogResult>>(MatDialogRef);

  protected includeMode: IncludeMode = this.data.selection.includeMode;
  protected includeValues = [...this.data.selection.includeValues];
  protected excludeValues = [...this.data.selection.excludeValues];
  protected sortDirection: SortMenuValue = this.data.sortDirection;

  constructor() {
    this.dialogRef.disableClose = true;
    this.dialogRef.backdropClick().subscribe(() => this.closeWithState());
    this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        this.closeWithState();
      }
    });
  }

  protected toggleInclude(value: string): void {
    this.includeValues = this.toggleValue(this.includeValues, value);
    this.excludeValues = this.excludeValues.filter((item) => item !== value);
  }

  protected toggleExclude(value: string): void {
    this.excludeValues = this.toggleValue(this.excludeValues, value);
    this.includeValues = this.includeValues.filter((item) => item !== value);
  }

  protected closeWithState(): void {
    this.dialogRef.close({
      section: this.data.section,
      selection: {
        includeMode: this.includeMode,
        includeValues: this.includeValues,
        excludeValues: this.excludeValues,
      },
      sortDirection: this.sortDirection,
    });
  }

  private toggleValue(values: string[], value: string): string[] {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }
}

@Component({
  selector: 'app-root',
  imports: [MatButtonModule, MatCardModule, MatChipsModule, MatDialogModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly operatorApi = inject(OperatorApi);
  private readonly dialog = inject(MatDialog);

  protected readonly sections = FILTER_SECTIONS;
  protected readonly selectedFilters = signal<Partial<Record<FilterKey, FilterSelection>>>({});
  protected readonly pageNumber = signal(0);
  protected readonly pageSize = signal(10);
  protected readonly activeSorts = signal<SortSpec[]>([
    { field: 'rarity', direction: 'desc' },
    { field: 'name', direction: 'asc' },
  ]);
  protected readonly expandedCards = signal<ReadonlySet<number | string>>(new Set());
  protected readonly resultPage = signal<OperatorResponse | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly selectedCount = computed(() =>
    Object.values(this.selectedFilters()).reduce(
      (count, selection) =>
        count + (selection?.includeValues.length ?? 0) + (selection?.excludeValues.length ?? 0),
      0,
    ),
  );
  protected readonly results = computed(() => this.resultPage()?.operators ?? []);
  protected readonly totalElements = computed(() => this.resultPage()?.page.totalElements ?? 0);
  protected readonly totalPages = computed(() => this.resultPage()?.page.totalPages ?? 0);
  protected readonly pageLabel = computed(() => {
    const totalPages = this.totalPages();
    return totalPages > 0 ? `${this.pageNumber() + 1} / ${totalPages}` : '0 / 0';
  });

  constructor() {
    this.search();
  }

  protected openFilter(section: FilterSection): void {
    const originalSelection = this.selectionFor(section);
    const originalSort = this.sectionSortDirection(section);

    this.dialog
      .open<FilterDialog, FilterDialogData, FilterDialogResult>(FilterDialog, {
        width: 'min(760px, calc(100vw - 32px))',
        maxWidth: '100vw',
        data: {
          section,
          selection: this.cloneSelection(originalSelection),
          sortDirection: originalSort,
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }

        const changed =
          JSON.stringify(result.selection) !== JSON.stringify(originalSelection) ||
          result.sortDirection !== originalSort;

        this.applyFilterResult(result);

        if (changed) {
          this.pageNumber.set(0);
          this.search();
        }
      });
  }

  protected isSectionActive(section: FilterSection): boolean {
    const selection = this.selectedFilters()[section.key];
    return (
      (selection?.includeValues.length ?? 0) > 0 ||
      (selection?.excludeValues.length ?? 0) > 0 ||
      this.sectionSortDirection(section) !== 'none'
    );
  }

  protected sectionSummary(section: FilterSection): string {
    const selection = this.selectedFilters()[section.key];
    const filterCount = (selection?.includeValues.length ?? 0) + (selection?.excludeValues.length ?? 0);
    const sort = this.sectionSortDirection(section);
    const parts: string[] = [];

    if (filterCount > 0) {
      parts.push(`${filterCount} filter${filterCount === 1 ? '' : 's'}`);
    }

    if (sort !== 'none') {
      parts.push(sort);
    }

    return parts.join(' / ');
  }

  protected clearFilters(): void {
    this.selectedFilters.set({});
    this.activeSorts.set([
      { field: 'rarity', direction: 'desc' },
      { field: 'name', direction: 'asc' },
    ]);
    this.pageNumber.set(0);
    this.search();
  }

  protected previousPage(): void {
    if (this.pageNumber() === 0) {
      return;
    }

    this.pageNumber.update((page) => page - 1);
    this.search();
  }

  protected nextPage(): void {
    if (this.pageNumber() + 1 >= this.totalPages()) {
      return;
    }

    this.pageNumber.update((page) => page + 1);
    this.search();
  }

  protected displayValue(operator: OperatorRecord, key: keyof OperatorRecord): string {
    const value = operator[key];

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'None';
    }

    return value === undefined || value === null || value === '' ? 'Unknown' : String(value);
  }

  protected classBranch(operator: OperatorRecord): string {
    return `${this.displayValue(operator, 'class')} | ${this.displayValue(operator, 'branch')}`;
  }

  protected rarityStars(operator: OperatorRecord): string {
    const rarity = Math.max(0, Math.min(6, Number(operator.rarity ?? 0)));
    return `${'★'.repeat(rarity)}${'☆'.repeat(6 - rarity)}`;
  }

  protected metadata(operator: OperatorRecord, expanded: boolean): MetadataPill[] {
    const values: MetadataPill[] = [
      ...this.scalarMetadata(operator),
      ...this.arrayMetadata('Race', operator.races),
      ...this.arrayMetadata('Faction', operator.factions),
      ...this.arrayMetadata('Sub-faction', operator.sub_factions),
      ...this.arrayMetadata('Damage', operator.damage_types),
      ...this.arrayMetadata('Illust', operator.illustrators),
      ...this.arrayMetadata('Obtain', operator.obtain_methods),
      ...this.arrayMetadata('Skill Type', operator.skill_types),
      ...this.arrayMetadata('Tag', operator.tags),
      ...this.arrayMetadata('Status', operator.statuses),
      ...this.arrayMetadata('Elemental', operator.elemental_afflictions),
    ];

    return expanded ? values : values.slice(0, 8);
  }

  protected isExpanded(operator: OperatorRecord): boolean {
    return this.expandedCards().has(this.operatorKey(operator));
  }

  protected toggleExpanded(operator: OperatorRecord): void {
    const key = this.operatorKey(operator);

    this.expandedCards.update((expanded) => {
      const next = new Set(expanded);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  protected thumbnailSrc(operator: OperatorRecord): string {
    return operator.thumbnail ?? '';
  }

  protected trackOperator(index: number, operator: OperatorRecord): string | number {
    return operator.id ?? operator.name ?? index;
  }

  protected trackMetadata(index: number, pill: MetadataPill): string {
    return `${pill.label}:${pill.value}:${index}`;
  }

  private search(): void {
    this.loading.set(true);
    this.error.set('');

    this.operatorApi
      .search({
        page: this.pageNumber(),
        size: this.pageSize(),
        sorts: this.activeSorts(),
        predicates: this.predicates(),
      })
      .subscribe({
        next: (resultPage) => {
          this.resultPage.set(resultPage);
          this.loading.set(false);
        },
        error: () => {
          this.resultPage.set(null);
          this.error.set('Unable to reach the operator API.');
          this.loading.set(false);
        },
      });
  }

  private predicates(): PredicateFilter[] {
    return this.sections.flatMap((section): PredicateFilter[] => {
      const selection = this.selectedFilters()[section.key];

      if (!selection) {
        return [];
      }

      return [
        ...this.includePredicates(section, selection),
        ...selection.excludeValues.map((value) => ({
          group: 'not' as const,
          field: section.field,
          operator: 'eq' as const,
          value,
        })),
      ];
    });
  }

  private includePredicates(section: FilterSection, selection: FilterSelection): PredicateFilter[] {
    if (selection.includeValues.length === 0) {
      return [];
    }

    if (selection.includeMode === 'or') {
      return [
        {
          group: 'and',
          field: section.field,
          operator: selection.includeValues.length === 1 ? 'eq' : 'in',
          value: selection.includeValues.join('|'),
        },
      ];
    }

    return selection.includeValues.map((value) => ({
      group: 'and',
      field: section.field,
      operator: 'eq' as const,
      value,
    }));
  }

  private applyFilterResult(result: FilterDialogResult): void {
    this.selectedFilters.update((filters) => {
      const next = { ...filters };

      if (result.selection.includeValues.length === 0 && result.selection.excludeValues.length === 0) {
        delete next[result.section.key];
      } else {
        next[result.section.key] = result.selection;
      }

      return next;
    });
    this.setSectionSort(result.section, result.sortDirection);
  }

  private setSectionSort(section: FilterSection, direction: SortMenuValue): void {
    this.activeSorts.update((sorts) => {
      const withoutSection = sorts.filter((sort) => sort.field !== section.field);

      if (direction === 'none') {
        return withoutSection;
      }

      return [{ field: section.field, direction }, ...withoutSection];
    });
  }

  private sectionSortDirection(section: FilterSection): SortMenuValue {
    return this.activeSorts().find((sort) => sort.field === section.field)?.direction ?? 'none';
  }

  private selectionFor(section: FilterSection): FilterSelection {
    return (
      this.selectedFilters()[section.key] ?? {
        includeMode: 'or',
        includeValues: [],
        excludeValues: [],
      }
    );
  }

  private cloneSelection(selection: FilterSelection): FilterSelection {
    return {
      includeMode: selection.includeMode,
      includeValues: [...selection.includeValues],
      excludeValues: [...selection.excludeValues],
    };
  }

  private scalarMetadata(operator: OperatorRecord): MetadataPill[] {
    return [
      ['Gender', operator.gender],
      ['Position', operator.position],
      ['Infection', operator.infection_status],
      ['Month', operator.birthday_month],
      ['Experience', operator.combat_experience],
      ['Strength', operator.physical_strength],
      ['Mobility', operator.mobility],
      ['Endurance', operator.endurance],
      ['Tactical', operator.tactical_acumen],
      ['Combat', operator.combat_skill],
      ['Arts', operator.originium_arts_assimilation],
    ]
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([label, value]) => ({ label: String(label), value: String(value) }));
  }

  private arrayMetadata(label: string, values: string[] | undefined): MetadataPill[] {
    return (values ?? []).map((value) => ({ label, value }));
  }

  private operatorKey(operator: OperatorRecord): number | string {
    return operator.id ?? operator.name;
  }
}
