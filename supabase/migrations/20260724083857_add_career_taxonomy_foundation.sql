create extension if not exists pgcrypto;

do $$
begin
  create type public.taxonomy_version_status as enum (
    'draft',
    'review',
    'published',
    'retired'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.taxonomy_record_verification_status as enum (
    'draft',
    'ai_generated',
    'source_mapped',
    'expert_reviewed',
    'employer_validated',
    'published',
    'deprecated'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.career_level as enum (
    'entry',
    'practitioner',
    'senior_practitioner',
    'manager',
    'senior_manager',
    'executive',
    'specialist',
    'senior_specialist'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.taxonomy_skill_category as enum (
    'technical',
    'domain_knowledge',
    'digital',
    'tool',
    'project_delivery',
    'commercial',
    'leadership',
    'behavioural',
    'transferable',
    'regulatory',
    'language'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.skill_relationship_type as enum (
    'prerequisite_of',
    'specialisation_of',
    'related_to',
    'alternative_to',
    'builds_on',
    'commonly_used_with'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.occupation_skill_requirement_type as enum (
    'essential',
    'desirable',
    'emerging',
    'regulatory',
    'leadership_stage'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.career_transition_type as enum (
    'promotion',
    'lateral',
    'specialisation',
    'career_change',
    'return_to_work',
    'leadership',
    'consulting',
    'entrepreneurship',
    'bridge'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.taxonomy_alias_type as enum (
    'alternative_title',
    'abbreviation',
    'regional_title',
    'industry_title',
    'legacy_title',
    'informal_title'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.provenance_source_type as enum (
    'internal',
    'esco',
    'onet',
    'uk_soc',
    'professional_body',
    'employer',
    'industry_expert',
    'government',
    'academic',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.career_taxonomy_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  name text not null,
  description text,
  status public.taxonomy_version_status not null default 'draft',
  effective_from timestamptz,
  effective_to timestamptz,
  published_at timestamptz,
  published_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_taxonomy_versions_version_not_blank check (btrim(version) <> ''),
  constraint career_taxonomy_versions_name_not_blank check (btrim(name) <> ''),
  constraint career_taxonomy_versions_effective_range_chk check (
    effective_to is null
    or effective_from is null
    or effective_to > effective_from
  )
);

create unique index if not exists career_taxonomy_versions_version_uidx
  on public.career_taxonomy_versions(version);
create index if not exists career_taxonomy_versions_status_idx
  on public.career_taxonomy_versions(status);
create index if not exists career_taxonomy_versions_effective_from_idx
  on public.career_taxonomy_versions(effective_from);
create index if not exists career_taxonomy_versions_effective_to_idx
  on public.career_taxonomy_versions(effective_to);

create table if not exists public.career_families (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  slug text not null,
  description text,
  parent_family_id uuid,
  taxonomy_version_id uuid not null,
  verification_status public.taxonomy_record_verification_status not null default 'draft',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_families_parent_family_id_fkey foreign key (parent_family_id)
    references public.career_families(id) on delete set null,
  constraint career_families_taxonomy_version_id_fkey foreign key (taxonomy_version_id)
    references public.career_taxonomy_versions(id) on delete restrict,
  constraint career_families_code_not_blank check (btrim(code) <> ''),
  constraint career_families_name_not_blank check (btrim(name) <> ''),
  constraint career_families_slug_not_blank check (btrim(slug) <> ''),
  constraint career_families_not_own_parent_chk check (
    parent_family_id is null
    or parent_family_id <> id
  ),
  constraint career_families_display_order_non_negative_chk check (display_order >= 0)
);

create unique index if not exists career_families_code_uidx
  on public.career_families(code);
create unique index if not exists career_families_slug_uidx
  on public.career_families(slug);
create index if not exists career_families_parent_family_id_idx
  on public.career_families(parent_family_id);
create index if not exists career_families_taxonomy_version_id_idx
  on public.career_families(taxonomy_version_id);
create index if not exists career_families_verification_status_idx
  on public.career_families(verification_status);
create index if not exists career_families_is_active_idx
  on public.career_families(is_active);

create table if not exists public.occupations (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  canonical_title text not null,
  slug text not null,
  summary text not null,
  description text,
  career_family_id uuid not null,
  career_level public.career_level not null,
  country_code text,
  industry_context text,
  uk_soc_code text,
  onet_code text,
  esco_uri text,
  minimum_experience_years numeric(5, 2),
  typical_experience_years numeric(5, 2),
  maximum_experience_years numeric(5, 2),
  regulated boolean not null default false,
  regulation_notes text,
  taxonomy_version_id uuid not null,
  verification_status public.taxonomy_record_verification_status not null default 'draft',
  is_active boolean not null default true,
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint occupations_career_family_id_fkey foreign key (career_family_id)
    references public.career_families(id) on delete restrict,
  constraint occupations_taxonomy_version_id_fkey foreign key (taxonomy_version_id)
    references public.career_taxonomy_versions(id) on delete restrict,
  constraint occupations_code_not_blank check (btrim(code) <> ''),
  constraint occupations_canonical_title_not_blank check (btrim(canonical_title) <> ''),
  constraint occupations_slug_not_blank check (btrim(slug) <> ''),
  constraint occupations_summary_not_blank check (btrim(summary) <> ''),
  constraint occupations_country_code_length_chk check (
    country_code is null
    or char_length(country_code) = 2
  ),
  constraint occupations_minimum_experience_non_negative_chk check (
    minimum_experience_years is null
    or minimum_experience_years >= 0
  ),
  constraint occupations_typical_experience_non_negative_chk check (
    typical_experience_years is null
    or typical_experience_years >= 0
  ),
  constraint occupations_maximum_experience_non_negative_chk check (
    maximum_experience_years is null
    or maximum_experience_years >= 0
  ),
  constraint occupations_minimum_typical_order_chk check (
    minimum_experience_years is null
    or typical_experience_years is null
    or minimum_experience_years <= typical_experience_years
  ),
  constraint occupations_typical_maximum_order_chk check (
    typical_experience_years is null
    or maximum_experience_years is null
    or typical_experience_years <= maximum_experience_years
  ),
  constraint occupations_minimum_maximum_order_chk check (
    minimum_experience_years is null
    or maximum_experience_years is null
    or minimum_experience_years <= maximum_experience_years
  ),
  constraint occupations_effective_range_chk check (
    effective_to is null
    or effective_from is null
    or effective_to > effective_from
  )
);

create unique index if not exists occupations_code_uidx
  on public.occupations(code);
create unique index if not exists occupations_slug_uidx
  on public.occupations(slug);
create index if not exists occupations_canonical_title_idx
  on public.occupations(canonical_title);
create index if not exists occupations_career_family_id_idx
  on public.occupations(career_family_id);
create index if not exists occupations_career_level_idx
  on public.occupations(career_level);
create index if not exists occupations_country_code_idx
  on public.occupations(country_code);
create index if not exists occupations_uk_soc_code_idx
  on public.occupations(uk_soc_code);
create index if not exists occupations_onet_code_idx
  on public.occupations(onet_code);
create index if not exists occupations_taxonomy_version_id_idx
  on public.occupations(taxonomy_version_id);
create index if not exists occupations_verification_status_idx
  on public.occupations(verification_status);
create index if not exists occupations_is_active_idx
  on public.occupations(is_active);
create index if not exists occupations_active_family_level_idx
  on public.occupations(is_active, career_family_id, career_level);

create table if not exists public.taxonomy_skills (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  canonical_name text not null,
  slug text not null,
  description text not null,
  skill_category public.taxonomy_skill_category not null,
  parent_skill_id uuid,
  proficiency_framework text not null default 'cpx_1_5',
  taxonomy_version_id uuid not null,
  verification_status public.taxonomy_record_verification_status not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxonomy_skills_parent_skill_id_fkey foreign key (parent_skill_id)
    references public.taxonomy_skills(id) on delete set null,
  constraint taxonomy_skills_taxonomy_version_id_fkey foreign key (taxonomy_version_id)
    references public.career_taxonomy_versions(id) on delete restrict,
  constraint taxonomy_skills_code_not_blank check (btrim(code) <> ''),
  constraint taxonomy_skills_canonical_name_not_blank check (btrim(canonical_name) <> ''),
  constraint taxonomy_skills_slug_not_blank check (btrim(slug) <> ''),
  constraint taxonomy_skills_description_not_blank check (btrim(description) <> ''),
  constraint taxonomy_skills_proficiency_framework_not_blank check (btrim(proficiency_framework) <> ''),
  constraint taxonomy_skills_not_own_parent_chk check (
    parent_skill_id is null
    or parent_skill_id <> id
  )
);

create unique index if not exists taxonomy_skills_code_uidx
  on public.taxonomy_skills(code);
create unique index if not exists taxonomy_skills_slug_uidx
  on public.taxonomy_skills(slug);
create index if not exists taxonomy_skills_canonical_name_idx
  on public.taxonomy_skills(canonical_name);
create index if not exists taxonomy_skills_skill_category_idx
  on public.taxonomy_skills(skill_category);
create index if not exists taxonomy_skills_parent_skill_id_idx
  on public.taxonomy_skills(parent_skill_id);
create index if not exists taxonomy_skills_taxonomy_version_id_idx
  on public.taxonomy_skills(taxonomy_version_id);
create index if not exists taxonomy_skills_verification_status_idx
  on public.taxonomy_skills(verification_status);
create index if not exists taxonomy_skills_is_active_idx
  on public.taxonomy_skills(is_active);

create table if not exists public.occupation_aliases (
  id uuid primary key default gen_random_uuid(),
  occupation_id uuid not null,
  alias text not null,
  normalised_alias text not null,
  alias_type public.taxonomy_alias_type not null default 'alternative_title',
  country_code text,
  industry_context text,
  language_code text not null default 'en',
  source_name text,
  confidence numeric(5, 4),
  taxonomy_version_id uuid not null,
  verification_status public.taxonomy_record_verification_status not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint occupation_aliases_occupation_id_fkey foreign key (occupation_id)
    references public.occupations(id) on delete restrict,
  constraint occupation_aliases_taxonomy_version_id_fkey foreign key (taxonomy_version_id)
    references public.career_taxonomy_versions(id) on delete restrict,
  constraint occupation_aliases_alias_not_blank check (btrim(alias) <> ''),
  constraint occupation_aliases_normalised_alias_not_blank check (btrim(normalised_alias) <> ''),
  constraint occupation_aliases_language_code_not_blank check (btrim(language_code) <> ''),
  constraint occupation_aliases_country_code_length_chk check (
    country_code is null
    or char_length(country_code) = 2
  ),
  constraint occupation_aliases_confidence_range_chk check (
    confidence is null
    or (confidence >= 0 and confidence <= 1)
  )
);

create index if not exists occupation_aliases_occupation_id_idx
  on public.occupation_aliases(occupation_id);
create index if not exists occupation_aliases_normalised_alias_idx
  on public.occupation_aliases(normalised_alias);
create index if not exists occupation_aliases_country_code_idx
  on public.occupation_aliases(country_code);
create index if not exists occupation_aliases_industry_context_idx
  on public.occupation_aliases(industry_context);
create index if not exists occupation_aliases_taxonomy_version_id_idx
  on public.occupation_aliases(taxonomy_version_id);
create index if not exists occupation_aliases_is_active_idx
  on public.occupation_aliases(is_active);
create unique index if not exists occupation_aliases_context_uidx
  on public.occupation_aliases(
    occupation_id,
    normalised_alias,
    language_code,
    coalesce(country_code, ''),
    coalesce(industry_context, '')
  );

create table if not exists public.skill_aliases (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null,
  alias text not null,
  normalised_alias text not null,
  language_code text not null default 'en',
  country_code text,
  industry_context text,
  source_name text,
  confidence numeric(5, 4),
  taxonomy_version_id uuid not null,
  verification_status public.taxonomy_record_verification_status not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skill_aliases_skill_id_fkey foreign key (skill_id)
    references public.taxonomy_skills(id) on delete restrict,
  constraint skill_aliases_taxonomy_version_id_fkey foreign key (taxonomy_version_id)
    references public.career_taxonomy_versions(id) on delete restrict,
  constraint skill_aliases_alias_not_blank check (btrim(alias) <> ''),
  constraint skill_aliases_normalised_alias_not_blank check (btrim(normalised_alias) <> ''),
  constraint skill_aliases_language_code_not_blank check (btrim(language_code) <> ''),
  constraint skill_aliases_country_code_length_chk check (
    country_code is null
    or char_length(country_code) = 2
  ),
  constraint skill_aliases_confidence_range_chk check (
    confidence is null
    or (confidence >= 0 and confidence <= 1)
  )
);

create index if not exists skill_aliases_skill_id_idx
  on public.skill_aliases(skill_id);
create index if not exists skill_aliases_normalised_alias_idx
  on public.skill_aliases(normalised_alias);
create index if not exists skill_aliases_taxonomy_version_id_idx
  on public.skill_aliases(taxonomy_version_id);
create index if not exists skill_aliases_is_active_idx
  on public.skill_aliases(is_active);
create unique index if not exists skill_aliases_context_uidx
  on public.skill_aliases(
    skill_id,
    normalised_alias,
    language_code,
    coalesce(country_code, ''),
    coalesce(industry_context, '')
  );

create table if not exists public.skill_relationships (
  id uuid primary key default gen_random_uuid(),
  source_skill_id uuid not null,
  target_skill_id uuid not null,
  relationship_type public.skill_relationship_type not null,
  weight numeric(5, 4),
  description text,
  taxonomy_version_id uuid not null,
  verification_status public.taxonomy_record_verification_status not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint skill_relationships_source_skill_id_fkey foreign key (source_skill_id)
    references public.taxonomy_skills(id) on delete restrict,
  constraint skill_relationships_target_skill_id_fkey foreign key (target_skill_id)
    references public.taxonomy_skills(id) on delete restrict,
  constraint skill_relationships_taxonomy_version_id_fkey foreign key (taxonomy_version_id)
    references public.career_taxonomy_versions(id) on delete restrict,
  constraint skill_relationships_distinct_skills_chk check (source_skill_id <> target_skill_id),
  constraint skill_relationships_weight_range_chk check (
    weight is null
    or (weight >= 0 and weight <= 1)
  )
);

create index if not exists skill_relationships_source_skill_id_idx
  on public.skill_relationships(source_skill_id);
create index if not exists skill_relationships_target_skill_id_idx
  on public.skill_relationships(target_skill_id);
create index if not exists skill_relationships_relationship_type_idx
  on public.skill_relationships(relationship_type);
create index if not exists skill_relationships_taxonomy_version_id_idx
  on public.skill_relationships(taxonomy_version_id);
create index if not exists skill_relationships_source_relationship_idx
  on public.skill_relationships(source_skill_id, relationship_type);
create unique index if not exists skill_relationships_context_uidx
  on public.skill_relationships(
    source_skill_id,
    target_skill_id,
    relationship_type,
    taxonomy_version_id
  );

create table if not exists public.occupation_skill_requirements (
  id uuid primary key default gen_random_uuid(),
  occupation_id uuid not null,
  skill_id uuid not null,
  requirement_type public.occupation_skill_requirement_type not null,
  required_level integer not null,
  minimum_level integer,
  importance_weight numeric(5, 4) not null,
  years_expected numeric(5, 2),
  evidence_required boolean not null default true,
  description text,
  country_code text,
  industry_context text,
  taxonomy_version_id uuid not null,
  verification_status public.taxonomy_record_verification_status not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint occupation_skill_requirements_occupation_id_fkey foreign key (occupation_id)
    references public.occupations(id) on delete restrict,
  constraint occupation_skill_requirements_skill_id_fkey foreign key (skill_id)
    references public.taxonomy_skills(id) on delete restrict,
  constraint occupation_skill_requirements_taxonomy_version_id_fkey foreign key (taxonomy_version_id)
    references public.career_taxonomy_versions(id) on delete restrict,
  constraint occupation_skill_requirements_required_level_range_chk check (required_level between 1 and 5),
  constraint occupation_skill_requirements_minimum_level_range_chk check (
    minimum_level is null
    or minimum_level between 1 and 5
  ),
  constraint occupation_skill_requirements_minimum_required_order_chk check (
    minimum_level is null
    or minimum_level <= required_level
  ),
  constraint occupation_skill_requirements_importance_weight_range_chk check (
    importance_weight > 0
    and importance_weight <= 1
  ),
  constraint occupation_skill_requirements_years_expected_non_negative_chk check (
    years_expected is null
    or years_expected >= 0
  ),
  constraint occupation_skill_requirements_country_code_length_chk check (
    country_code is null
    or char_length(country_code) = 2
  )
);

create index if not exists occupation_skill_requirements_occupation_id_idx
  on public.occupation_skill_requirements(occupation_id);
create index if not exists occupation_skill_requirements_skill_id_idx
  on public.occupation_skill_requirements(skill_id);
create index if not exists occupation_skill_requirements_requirement_type_idx
  on public.occupation_skill_requirements(requirement_type);
create index if not exists occupation_skill_requirements_taxonomy_version_id_idx
  on public.occupation_skill_requirements(taxonomy_version_id);
create index if not exists occupation_skill_requirements_occupation_requirement_idx
  on public.occupation_skill_requirements(occupation_id, requirement_type);
create index if not exists occupation_skill_requirements_occupation_active_idx
  on public.occupation_skill_requirements(occupation_id, is_active);
create unique index if not exists occupation_skill_requirements_context_uidx
  on public.occupation_skill_requirements(
    occupation_id,
    skill_id,
    requirement_type,
    coalesce(country_code, ''),
    coalesce(industry_context, ''),
    taxonomy_version_id
  );

create table if not exists public.career_transitions (
  id uuid primary key default gen_random_uuid(),
  from_occupation_id uuid not null,
  to_occupation_id uuid not null,
  transition_type public.career_transition_type not null,
  difficulty_score integer not null,
  transferability_score numeric(5, 4),
  minimum_readiness_score numeric(5, 2),
  typical_duration_months integer,
  minimum_duration_months integer,
  maximum_duration_months integer,
  description text,
  rationale text,
  country_code text,
  industry_context text,
  taxonomy_version_id uuid not null,
  verification_status public.taxonomy_record_verification_status not null default 'draft',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint career_transitions_from_occupation_id_fkey foreign key (from_occupation_id)
    references public.occupations(id) on delete restrict,
  constraint career_transitions_to_occupation_id_fkey foreign key (to_occupation_id)
    references public.occupations(id) on delete restrict,
  constraint career_transitions_taxonomy_version_id_fkey foreign key (taxonomy_version_id)
    references public.career_taxonomy_versions(id) on delete restrict,
  constraint career_transitions_distinct_occupations_chk check (from_occupation_id <> to_occupation_id),
  constraint career_transitions_difficulty_score_range_chk check (difficulty_score between 1 and 5),
  constraint career_transitions_transferability_score_range_chk check (
    transferability_score is null
    or (transferability_score >= 0 and transferability_score <= 1)
  ),
  constraint career_transitions_minimum_readiness_score_range_chk check (
    minimum_readiness_score is null
    or (minimum_readiness_score >= 0 and minimum_readiness_score <= 100)
  ),
  constraint career_transitions_typical_duration_non_negative_chk check (
    typical_duration_months is null
    or typical_duration_months >= 0
  ),
  constraint career_transitions_minimum_duration_non_negative_chk check (
    minimum_duration_months is null
    or minimum_duration_months >= 0
  ),
  constraint career_transitions_maximum_duration_non_negative_chk check (
    maximum_duration_months is null
    or maximum_duration_months >= 0
  ),
  constraint career_transitions_minimum_typical_duration_order_chk check (
    minimum_duration_months is null
    or typical_duration_months is null
    or minimum_duration_months <= typical_duration_months
  ),
  constraint career_transitions_typical_maximum_duration_order_chk check (
    typical_duration_months is null
    or maximum_duration_months is null
    or typical_duration_months <= maximum_duration_months
  ),
  constraint career_transitions_minimum_maximum_duration_order_chk check (
    minimum_duration_months is null
    or maximum_duration_months is null
    or minimum_duration_months <= maximum_duration_months
  ),
  constraint career_transitions_country_code_length_chk check (
    country_code is null
    or char_length(country_code) = 2
  )
);

create index if not exists career_transitions_from_occupation_id_idx
  on public.career_transitions(from_occupation_id);
create index if not exists career_transitions_to_occupation_id_idx
  on public.career_transitions(to_occupation_id);
create index if not exists career_transitions_transition_type_idx
  on public.career_transitions(transition_type);
create index if not exists career_transitions_taxonomy_version_id_idx
  on public.career_transitions(taxonomy_version_id);
create index if not exists career_transitions_from_active_idx
  on public.career_transitions(from_occupation_id, is_active);
create index if not exists career_transitions_to_active_idx
  on public.career_transitions(to_occupation_id, is_active);
create unique index if not exists career_transitions_context_uidx
  on public.career_transitions(
    from_occupation_id,
    to_occupation_id,
    transition_type,
    coalesce(country_code, ''),
    coalesce(industry_context, ''),
    taxonomy_version_id
  );

create table if not exists public.taxonomy_source_references (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  source_type public.provenance_source_type not null,
  source_name text not null,
  source_record_id text,
  source_url text,
  source_version text,
  licence_name text,
  licence_url text,
  retrieved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxonomy_source_references_entity_type_not_blank check (btrim(entity_type) <> ''),
  constraint taxonomy_source_references_source_name_not_blank check (btrim(source_name) <> '')
);

create index if not exists taxonomy_source_references_entity_idx
  on public.taxonomy_source_references(entity_type, entity_id);
create index if not exists taxonomy_source_references_source_type_idx
  on public.taxonomy_source_references(source_type);
create unique index if not exists taxonomy_source_references_source_record_uidx
  on public.taxonomy_source_references(
    entity_type,
    entity_id,
    source_type,
    source_name,
    coalesce(source_record_id, ''),
    coalesce(source_url, '')
  );
