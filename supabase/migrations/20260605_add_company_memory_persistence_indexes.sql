create index if not exists cmr_company_group_version_idx
  on public.company_memory_records (company_id, memory_group_id, record_version);

create index if not exists cmr_record_input_hash_idx
  on public.company_memory_records (company_id, record_input_determinism_hash);

create index if not exists cmr_persistence_hash_idx
  on public.company_memory_records (company_id, persistence_determinism_hash);

create index if not exists cmr_memory_key_status_idx
  on public.company_memory_records (company_id, memory_key, memory_status);

create index if not exists cmr_memory_key_group_idx
  on public.company_memory_records (company_id, memory_key, memory_group_id);

create index if not exists cmr_entity_scope_id_idx
  on public.company_memory_records (company_id, entity_scope, entity_id);

create index if not exists cmr_entity_type_id_idx
  on public.company_memory_records (company_id, entity_type, entity_id);

create index if not exists cmr_consolidation_group_idx
  on public.company_memory_records (company_id, consolidation_group_id);

create index if not exists cmr_source_system_tenant_idx
  on public.company_memory_records (company_id, source_system, tenant_id);

create index if not exists cmr_domain_subdomain_status_idx
  on public.company_memory_records (company_id, domain, subdomain, memory_status);

create index if not exists cmr_topic_status_idx
  on public.company_memory_records (company_id, topic, memory_status);

create index if not exists cmr_record_type_status_idx
  on public.company_memory_records (company_id, intelligence_record_type, memory_status);

create index if not exists cmr_industry_domain_status_idx
  on public.company_memory_records (company_id, industry, domain, memory_status);

create index if not exists cmr_governance_status_idx
  on public.company_memory_records (company_id, governance_status);

create index if not exists cmr_refresh_status_idx
  on public.company_memory_records (company_id, refresh_status);

create index if not exists cmr_legal_hold_retention_idx
  on public.company_memory_records (company_id, legal_hold, retention_expires_at);

create index if not exists cmr_active_records_idx
  on public.company_memory_records (company_id, memory_group_id)
  where memory_status = 'active';

create index if not exists cmr_legal_hold_true_idx
  on public.company_memory_records (company_id, memory_id)
  where legal_hold = true;

create index if not exists cmr_needs_review_idx
  on public.company_memory_records (company_id, memory_id)
  where refresh_status = 'needs_review';

create index if not exists cmr_needs_reprocessing_idx
  on public.company_memory_records (company_id, memory_id)
  where refresh_status = 'needs_reprocessing';

create index if not exists cmr_history_status_idx
  on public.company_memory_records (company_id, memory_group_id, memory_status)
  where memory_status in ('archived', 'superseded');

create index if not exists cmrs_company_memory_idx
  on public.company_memory_record_sources (company_id, memory_id);

create index if not exists cmrs_source_record_idx
  on public.company_memory_record_sources (company_id, source_system, source_record_id);

create index if not exists cmrs_snapshot_idx
  on public.company_memory_record_sources (company_id, snapshot_id);

create index if not exists cmrs_source_set_hash_idx
  on public.company_memory_record_sources (company_id, source_set_hash);

create index if not exists cmrs_source_type_source_id_idx
  on public.company_memory_record_sources (company_id, source_type, source_id);

create index if not exists cmrs_source_tenant_period_idx
  on public.company_memory_record_sources (company_id, source_system, tenant_id, period_key);

create index if not exists cmrl_company_memory_idx
  on public.company_memory_record_lineage (company_id, memory_id);

create index if not exists cmrl_company_group_idx
  on public.company_memory_record_lineage (company_id, memory_group_id);

create index if not exists cmrl_candidate_idx
  on public.company_memory_record_lineage (company_id, candidate_id);

create index if not exists cmrl_promotion_idx
  on public.company_memory_record_lineage (company_id, promotion_id);

create index if not exists cmrl_retrieval_lineage_idx
  on public.company_memory_record_lineage (company_id, retrieval_lineage_id);

create index if not exists cmrl_lineage_hash_idx
  on public.company_memory_record_lineage (company_id, lineage_hash);

create index if not exists cmra_memory_created_idx
  on public.company_memory_record_audit (company_id, memory_id, created_at);

create index if not exists cmra_group_created_idx
  on public.company_memory_record_audit (company_id, memory_group_id, created_at);

create index if not exists cmra_event_created_idx
  on public.company_memory_record_audit (company_id, event_type, created_at);

create index if not exists cmra_persistence_run_idx
  on public.company_memory_record_audit (company_id, persistence_run_id);

create index if not exists cmra_request_idx
  on public.company_memory_record_audit (company_id, request_id);

create index if not exists cmra_event_hash_idx
  on public.company_memory_record_audit (company_id, event_hash);

create index if not exists cmrv_group_version_idx
  on public.company_memory_record_versions (company_id, memory_group_id, record_version);

create index if not exists cmrv_memory_key_idx
  on public.company_memory_record_versions (company_id, memory_key);

create index if not exists cmrv_status_created_idx
  on public.company_memory_record_versions (company_id, version_status, created_at);

create index if not exists cmrv_active_group_idx
  on public.company_memory_record_versions (company_id, memory_group_id)
  where version_status = 'active';

create index if not exists cmre_memory_created_idx
  on public.company_memory_record_retention_events (company_id, memory_id, created_at);

create index if not exists cmre_event_created_idx
  on public.company_memory_record_retention_events (company_id, event_type, created_at);

create index if not exists cmre_legal_hold_after_idx
  on public.company_memory_record_retention_events (company_id, legal_hold_after);

create index if not exists cmre_retention_expires_after_idx
  on public.company_memory_record_retention_events (company_id, retention_expires_at_after);

create index if not exists cmre_legal_hold_true_idx
  on public.company_memory_record_retention_events (company_id, memory_id)
  where legal_hold_after = true;
