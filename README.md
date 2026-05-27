# Arknights Filter Tool Frontend

Arknights is the copyright of Hypergryph. This is a personal learning fanmade project. Angular frontend for the Arknights operator filter tool. The app queries a Spring Boot REST API with server-side pagination, sorting, and structured predicate filtering.

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
