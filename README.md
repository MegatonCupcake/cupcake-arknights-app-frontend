# Arknights Filter Tool Frontend

Angular frontend for the Arknights operator filter tool. The app queries a Spring Boot REST API with server-side pagination, sorting, and structured predicate filtering.

## Development

```bash
npm install
npm start
```

The local app runs at `http://localhost:4200/`.

Development API base URL is configured in `src/environments/environment.ts`:

```ts
apiBaseUrl: 'http://localhost:8080'
```

The backend must allow CORS from `http://localhost:4200` during local development.

Start the frontend with:

```bash
npm start
```

Angular serves the frontend on `http://localhost:4200`.

## API Contract

The frontend calls:

```text
GET {apiBaseUrl}/api/operators
```

Query params use backend predicate filters:

```text
page=0
size=10
and=class:eq:Caster
and=rarity:eq:5
and=rarity:eq:6
and=skill_type:in:Auto Recovery|Manual
and=faction:eq:Rhodes Island
not=status:eq:stun
sort=rarity,desc
sort=name,asc
```

Selected filter sections are combined with AND predicates. Within one section, `includes` selections use an `and=field:in:a|b` predicate, `include all` selections use repeated `and=field:eq:value` predicates, and excluded values use repeated `not=field:eq:value` predicates. The UI supports multiple active sorts; the most recently changed section sort has highest precedence.

Filter option values are sourced from the CSV files in `db csvs`, including skill types. Operator thumbnail paths from the backend are served from `operator_thumbnails`.

## GitHub Pages Build

Production API base URL is configured in `src/environments/environment.production.ts`. It currently matches the development URL, `http://localhost:8080`, until a deployed backend URL is available.

Build for GitHub Pages:

```bash
npm run build:gh-pages
```

The script uses:

```text
--base-href /Arknights_filter_tool_frontend/
```

Update that base href if the GitHub repository name changes.

## Tests

```bash
npm test -- --watch=false
```
