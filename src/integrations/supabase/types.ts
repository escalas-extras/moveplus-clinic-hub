export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          data: string
          duracao_min: number
          horario: string
          id: string
          observacao: string | null
          patient_id: string | null
          professional_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          data: string
          duracao_min?: number
          horario: string
          id?: string
          observacao?: string | null
          patient_id: string | null
          professional_id: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          duracao_min?: number
          horario?: string
          id?: string
          observacao?: string | null
          patient_id?: string
          professional_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "appointments_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_audit_log: {
        Row: {
          action: string
          assessment_id: string | null
          details: Json | null
          id: string
          occurred_at: string
          patient_id: string | null
          step: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          assessment_id?: string | null
          details?: Json | null
          id?: string
          occurred_at?: string
          patient_id?: string | null
          step?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          assessment_id?: string | null
          details?: Json | null
          id?: string
          occurred_at?: string
          patient_id?: string | null
          step?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_audit_log_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_audit_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_drafts: {
        Row: {
          assessment_id: string | null
          created_at: string
          id: string
          patient_id: string
          payload: Json
          updated_at: string
          user_id: string
          wizard_step: number
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          patient_id: string
          payload?: Json
          updated_at?: string
          user_id: string
          wizard_step?: number
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          patient_id?: string
          payload?: Json
          updated_at?: string
          user_id?: string
          wizard_step?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_drafts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_drafts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_goals: {
        Row: {
          achieved_at: string | null
          assessment_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          notes: string | null
          patient_id: string
          progress_pct: number
          status: Database["public"]["Enums"]["goal_status"]
          target_date: string | null
          term: Database["public"]["Enums"]["goal_term"]
          updated_at: string
        }
        Insert: {
          achieved_at?: string | null
          assessment_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          patient_id: string
          progress_pct?: number
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          term: Database["public"]["Enums"]["goal_term"]
          updated_at?: string
        }
        Update: {
          achieved_at?: string | null
          assessment_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          patient_id?: string
          progress_pct?: number
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          term?: Database["public"]["Enums"]["goal_term"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_goals_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_goniometry: {
        Row: {
          applied_at: string
          assessment_id: string | null
          created_at: string
          created_by: string | null
          id: string
          measurements: Json
          notes: string | null
          patient_id: string
          updated_at: string
        }
        Insert: {
          applied_at?: string
          assessment_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          measurements?: Json
          notes?: string | null
          patient_id: string
          updated_at?: string
        }
        Update: {
          applied_at?: string
          assessment_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          measurements?: Json
          notes?: string | null
          patient_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_goniometry_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_goniometry_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_modules: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          module_type: Database["public"]["Enums"]["assessment_module_type"]
          payload: Json
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          module_type: Database["public"]["Enums"]["assessment_module_type"]
          payload?: Json
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          module_type?: Database["public"]["Enums"]["assessment_module_type"]
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "assessment_modules_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_mrc: {
        Row: {
          applied_at: string
          assessment_id: string | null
          classification: string | null
          created_at: string
          created_by: string | null
          id: string
          measurements: Json
          notes: string | null
          patient_id: string
          total_left: number | null
          total_right: number | null
          updated_at: string
        }
        Insert: {
          applied_at?: string
          assessment_id?: string | null
          classification?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          measurements?: Json
          notes?: string | null
          patient_id: string
          total_left?: number | null
          total_right?: number | null
          updated_at?: string
        }
        Update: {
          applied_at?: string
          assessment_id?: string | null
          classification?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          measurements?: Json
          notes?: string | null
          patient_id?: string
          total_left?: number | null
          total_right?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_mrc_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_mrc_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_neuro: {
        Row: {
          assessment_id: string
          clonus: string | null
          consciencia: string | null
          id: string
          manobras_deficitarias: string | null
          motricidade: string | null
          reflexos: Json | null
          sensibilidade: Json | null
          testes: string | null
          tonus: string | null
          trofismo: string | null
        }
        Insert: {
          assessment_id: string
          clonus?: string | null
          consciencia?: string | null
          id?: string
          manobras_deficitarias?: string | null
          motricidade?: string | null
          reflexos?: Json | null
          sensibilidade?: Json | null
          testes?: string | null
          tonus?: string | null
          trofismo?: string | null
        }
        Update: {
          assessment_id?: string
          clonus?: string | null
          consciencia?: string | null
          id?: string
          manobras_deficitarias?: string | null
          motricidade?: string | null
          reflexos?: Json | null
          sensibilidade?: Json | null
          testes?: string | null
          tonus?: string | null
          trofismo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_neuro_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_ortho: {
        Row: {
          adm: Json | null
          assessment_id: string
          eva: number | null
          fm_mmii: Json | null
          fm_mmss: Json | null
          goniometria: Json | null
          id: string
          perimetria: Json | null
          testes_especificos: string | null
        }
        Insert: {
          adm?: Json | null
          assessment_id: string
          eva?: number | null
          fm_mmii?: Json | null
          fm_mmss?: Json | null
          goniometria?: Json | null
          id?: string
          perimetria?: Json | null
          testes_especificos?: string | null
        }
        Update: {
          adm?: Json | null
          assessment_id?: string
          eva?: number | null
          fm_mmii?: Json | null
          fm_mmss?: Json | null
          goniometria?: Json | null
          id?: string
          perimetria?: Json | null
          testes_especificos?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_ortho_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_postural: {
        Row: {
          anterior: string | null
          assessment_id: string
          foto_anterior: string | null
          foto_lat_d: string | null
          foto_lat_e: string | null
          foto_posterior: string | null
          id: string
          lat_direita: string | null
          lat_esquerda: string | null
          posterior: string | null
        }
        Insert: {
          anterior?: string | null
          assessment_id: string
          foto_anterior?: string | null
          foto_lat_d?: string | null
          foto_lat_e?: string | null
          foto_posterior?: string | null
          id?: string
          lat_direita?: string | null
          lat_esquerda?: string | null
          posterior?: string | null
        }
        Update: {
          anterior?: string | null
          assessment_id?: string
          foto_anterior?: string | null
          foto_lat_d?: string | null
          foto_lat_e?: string | null
          foto_posterior?: string | null
          id?: string
          lat_direita?: string | null
          lat_esquerda?: string | null
          posterior?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_postural_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_scales: {
        Row: {
          applied_at: string
          assessment_id: string | null
          classification: string | null
          created_at: string
          created_by: string | null
          id: string
          items: Json
          notes: string | null
          patient_id: string
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          scale_type: Database["public"]["Enums"]["scale_type"]
          total_score: number | null
          updated_at: string
        }
        Insert: {
          applied_at?: string
          assessment_id?: string | null
          classification?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          patient_id: string
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          scale_type: Database["public"]["Enums"]["scale_type"]
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          applied_at?: string
          assessment_id?: string | null
          classification?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          patient_id?: string
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          scale_type?: Database["public"]["Enums"]["scale_type"]
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scales_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_scales_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_vitals: {
        Row: {
          angina: string | null
          assessment_id: string
          ausculta_pulmonar: string | null
          cianose: string | null
          dispneia: string | null
          edema: string | null
          fc: string | null
          fr: string | null
          id: string
          pa: string | null
          pr: string | null
          rr: string | null
          secrecao: string | null
          sincope: string | null
          temperatura: number | null
          tosse: string | null
        }
        Insert: {
          angina?: string | null
          assessment_id: string
          ausculta_pulmonar?: string | null
          cianose?: string | null
          dispneia?: string | null
          edema?: string | null
          fc?: string | null
          fr?: string | null
          id?: string
          pa?: string | null
          pr?: string | null
          rr?: string | null
          secrecao?: string | null
          sincope?: string | null
          temperatura?: number | null
          tosse?: string | null
        }
        Update: {
          angina?: string | null
          assessment_id?: string
          ausculta_pulmonar?: string | null
          cianose?: string | null
          dispneia?: string | null
          edema?: string | null
          fc?: string | null
          fr?: string | null
          id?: string
          pa?: string | null
          pr?: string | null
          rr?: string | null
          secrecao?: string | null
          sincope?: string | null
          temperatura?: number | null
          tosse?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_vitals_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          antecedentes_familiares: string | null
          antecedentes_pessoais: string | null
          apresentacao: string[]
          avaliacao_algica: Json | null
          cid_secundario: string | null
          cirurgias: string | null
          clinic_id: string
          clinical_profiles: string[]
          condutas: string | null
          coordenacao: string | null
          created_at: string
          created_by: string | null
          data: string
          dependency_level: string | null
          diagnosis_codes: string[]
          diagnostico_clinico: string | null
          diagnostico_fisio: string | null
          doencas_previas: Json | null
          equilibrio: string | null
          estatura: number | null
          eva: number | null
          exame_fisico: Json | null
          exames_complementares: string | null
          executive_summary: Json | null
          habitos_anamnese: Json | null
          habitos_vida: string | null
          historia_clinica: string | null
          hma: string | null
          hmp: string | null
          icq: number | null
          id: string
          imc: number | null
          inspecao: string | null
          inspecao_flags: string[]
          last_autosaved_at: string | null
          locked_at: string | null
          marcha: string | null
          med_cintura: number | null
          med_quadril: number | null
          medicamentos: string | null
          medico_responsavel: string | null
          next_reassessment_date: string | null
          nivel_consciencia: string | null
          objetivos: string | null
          observacoes_gerais: string | null
          palpacao: string | null
          patient_id: string
          peso: number | null
          postura_alinhamento: Json | null
          professional_id: string
          prognostico: string | null
          qr_validation_token: string | null
          queixa_principal: string | null
          recursos_terapeuticos: string | null
          risk_falls: string | null
          risk_pressure: string | null
          rom_goniometry: Json | null
          scales_results: Json | null
          semiologia: string | null
          signatures: Json | null
          sinais_vitais: Json | null
          status: Database["public"]["Enums"]["assessment_status"]
          strength_mrc: Json | null
          tem_exames: boolean | null
          testes_especificos: string | null
          teve_cirurgias: boolean | null
          therapeutic_goals: Json | null
          tipo: Database["public"]["Enums"]["assessment_type"]
          tratamentos_realizados: string | null
          updated_at: string
          usa_medicamentos: boolean | null
          wizard_completed: boolean
          wizard_step: number
        }
        Insert: {
          antecedentes_familiares?: string | null
          antecedentes_pessoais?: string | null
          apresentacao?: string[]
          avaliacao_algica?: Json | null
          cid_secundario?: string | null
          cirurgias?: string | null
          clinic_id: string
          clinical_profiles?: string[]
          condutas?: string | null
          coordenacao?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          dependency_level?: string | null
          diagnosis_codes?: string[]
          diagnostico_clinico?: string | null
          diagnostico_fisio?: string | null
          doencas_previas?: Json | null
          equilibrio?: string | null
          estatura?: number | null
          eva?: number | null
          exame_fisico?: Json | null
          exames_complementares?: string | null
          executive_summary?: Json | null
          habitos_anamnese?: Json | null
          habitos_vida?: string | null
          historia_clinica?: string | null
          hma?: string | null
          hmp?: string | null
          icq?: number | null
          id?: string
          imc?: number | null
          inspecao?: string | null
          inspecao_flags?: string[]
          last_autosaved_at?: string | null
          locked_at?: string | null
          marcha?: string | null
          med_cintura?: number | null
          med_quadril?: number | null
          medicamentos?: string | null
          medico_responsavel?: string | null
          next_reassessment_date?: string | null
          nivel_consciencia?: string | null
          objetivos?: string | null
          observacoes_gerais?: string | null
          palpacao?: string | null
          patient_id: string
          peso?: number | null
          postura_alinhamento?: Json | null
          professional_id: string
          prognostico?: string | null
          qr_validation_token?: string | null
          queixa_principal?: string | null
          recursos_terapeuticos?: string | null
          risk_falls?: string | null
          risk_pressure?: string | null
          rom_goniometry?: Json | null
          scales_results?: Json | null
          semiologia?: string | null
          signatures?: Json | null
          sinais_vitais?: Json | null
          status?: Database["public"]["Enums"]["assessment_status"]
          strength_mrc?: Json | null
          tem_exames?: boolean | null
          testes_especificos?: string | null
          teve_cirurgias?: boolean | null
          therapeutic_goals?: Json | null
          tipo?: Database["public"]["Enums"]["assessment_type"]
          tratamentos_realizados?: string | null
          updated_at?: string
          usa_medicamentos?: boolean | null
          wizard_completed?: boolean
          wizard_step?: number
        }
        Update: {
          antecedentes_familiares?: string | null
          antecedentes_pessoais?: string | null
          apresentacao?: string[]
          avaliacao_algica?: Json | null
          cid_secundario?: string | null
          cirurgias?: string | null
          clinic_id?: string
          clinical_profiles?: string[]
          condutas?: string | null
          coordenacao?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          dependency_level?: string | null
          diagnosis_codes?: string[]
          diagnostico_clinico?: string | null
          diagnostico_fisio?: string | null
          doencas_previas?: Json | null
          equilibrio?: string | null
          estatura?: number | null
          eva?: number | null
          exame_fisico?: Json | null
          exames_complementares?: string | null
          executive_summary?: Json | null
          habitos_anamnese?: Json | null
          habitos_vida?: string | null
          historia_clinica?: string | null
          hma?: string | null
          hmp?: string | null
          icq?: number | null
          id?: string
          imc?: number | null
          inspecao?: string | null
          inspecao_flags?: string[]
          last_autosaved_at?: string | null
          locked_at?: string | null
          marcha?: string | null
          med_cintura?: number | null
          med_quadril?: number | null
          medicamentos?: string | null
          medico_responsavel?: string | null
          next_reassessment_date?: string | null
          nivel_consciencia?: string | null
          objetivos?: string | null
          observacoes_gerais?: string | null
          palpacao?: string | null
          patient_id?: string
          peso?: number | null
          postura_alinhamento?: Json | null
          professional_id?: string
          prognostico?: string | null
          qr_validation_token?: string | null
          queixa_principal?: string | null
          recursos_terapeuticos?: string | null
          risk_falls?: string | null
          risk_pressure?: string | null
          rom_goniometry?: Json | null
          scales_results?: Json | null
          semiologia?: string | null
          signatures?: Json | null
          sinais_vitais?: Json | null
          status?: Database["public"]["Enums"]["assessment_status"]
          strength_mrc?: Json | null
          tem_exames?: boolean | null
          testes_especificos?: string | null
          teve_cirurgias?: boolean | null
          therapeutic_goals?: Json | null
          tipo?: Database["public"]["Enums"]["assessment_type"]
          tratamentos_realizados?: string | null
          updated_at?: string
          usa_medicamentos?: boolean | null
          wizard_completed?: boolean
          wizard_step?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "assessments_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          id: string
          new_data: Json | null
          occurred_at: string
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          new_data?: Json | null
          occurred_at?: string
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      canonical_document_templates: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          is_default: boolean
          layout_config: Json
          name: string
          sections: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          id?: string
          is_default?: boolean
          layout_config?: Json
          name: string
          sections: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          is_default?: boolean
          layout_config?: Json
          name?: string
          sections?: Json
          updated_at?: string
        }
        Relationships: []
      }
      catalog_diagnoses: {
        Row: {
          active: boolean
          clinical_profiles: string[]
          code: string
          created_at: string
          default_reassessment_days: number | null
          id: string
          keywords: string[]
          label: string
          sort_order: number
          suggested_objectives: string[]
          suggested_scales: string[]
          template_anamnese: string | null
          template_condutas: string | null
          template_objetivos: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinical_profiles?: string[]
          code: string
          created_at?: string
          default_reassessment_days?: number | null
          id?: string
          keywords?: string[]
          label: string
          sort_order?: number
          suggested_objectives?: string[]
          suggested_scales?: string[]
          template_anamnese?: string | null
          template_condutas?: string | null
          template_objetivos?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinical_profiles?: string[]
          code?: string
          created_at?: string
          default_reassessment_days?: number | null
          id?: string
          keywords?: string[]
          label?: string
          sort_order?: number
          suggested_objectives?: string[]
          suggested_scales?: string[]
          template_anamnese?: string | null
          template_condutas?: string | null
          template_objetivos?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      catalog_objectives: {
        Row: {
          active: boolean
          clinical_profiles: string[]
          code: string
          created_at: string
          default_deadline_days: number | null
          default_indicator: string | null
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          clinical_profiles?: string[]
          code: string
          created_at?: string
          default_deadline_days?: number | null
          default_indicator?: string | null
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          clinical_profiles?: string[]
          code?: string
          created_at?: string
          default_deadline_days?: number | null
          default_indicator?: string | null
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      catalog_risk_classifications: {
        Row: {
          created_at: string
          id: string
          risk_type: string
          rules: Json
          source_scale_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          risk_type: string
          rules?: Json
          source_scale_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          risk_type?: string
          rules?: Json
          source_scale_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      catalog_scales: {
        Row: {
          active: boolean
          classification: Json
          clinical_profiles: string[]
          code: string
          created_at: string
          description: string | null
          id: string
          items: Json
          label: string
          max_score: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          classification?: Json
          clinical_profiles?: string[]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          label: string
          max_score?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          classification?: Json
          clinical_profiles?: string[]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          label?: string
          max_score?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      clinic_members: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          id: string
          is_default: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_plans: {
        Row: {
          canceled_at: string | null
          clinic_id: string
          created_at: string
          id: string
          notes: string | null
          plan_id: string
          started_at: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          notes?: string | null
          plan_id: string
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          app_name: string | null
          assinatura_padrao_url: string | null
          cep: string | null
          cidade: string | null
          clinic_id: string | null
          cnpj: string | null
          created_at: string
          crefito_default: string | null
          emails: string[] | null
          endereco: string | null
          estado: string | null
          id: string
          logo_url: string | null
          nome_fantasia: string
          primary_color: string | null
          razao_social: string | null
          rodape_institucional: string | null
          secondary_color: string | null
          slogan: string | null
          telefones: string[] | null
          updated_at: string
        }
        Insert: {
          app_name?: string | null
          assinatura_padrao_url?: string | null
          cep?: string | null
          cidade?: string | null
          clinic_id?: string | null
          cnpj?: string | null
          created_at?: string
          crefito_default?: string | null
          emails?: string[] | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia: string
          primary_color?: string | null
          razao_social?: string | null
          rodape_institucional?: string | null
          secondary_color?: string | null
          slogan?: string | null
          telefones?: string[] | null
          updated_at?: string
        }
        Update: {
          app_name?: string | null
          assinatura_padrao_url?: string | null
          cep?: string | null
          cidade?: string | null
          clinic_id?: string | null
          cnpj?: string | null
          created_at?: string
          crefito_default?: string | null
          emails?: string[] | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string
          primary_color?: string | null
          razao_social?: string | null
          rodape_institucional?: string | null
          secondary_color?: string | null
          slogan?: string | null
          telefones?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_documents: {
        Row: {
          assessment_id: string | null
          body_text: string | null
          clinic_id: string | null
          content: Json
          created_at: string
          created_by: string | null
          doc_type: Database["public"]["Enums"]["document_type"]
          id: string
          issued_at: string
          locked_at: string | null
          patient_id: string
          pdf_url: string | null
          professional_id: string | null
          rendered_html: string | null
          template_id: string | null
          template_version: number | null
          title: string
          updated_at: string
          validation_hash: string | null
        }
        Insert: {
          assessment_id?: string | null
          body_text?: string | null
          clinic_id?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          doc_type: Database["public"]["Enums"]["document_type"]
          id?: string
          issued_at?: string
          locked_at?: string | null
          patient_id: string
          pdf_url?: string | null
          professional_id?: string | null
          rendered_html?: string | null
          template_id?: string | null
          template_version?: number | null
          title: string
          updated_at?: string
          validation_hash?: string | null
        }
        Update: {
          assessment_id?: string | null
          body_text?: string | null
          clinic_id?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          doc_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          issued_at?: string
          locked_at?: string | null
          patient_id?: string
          pdf_url?: string | null
          professional_id?: string | null
          rendered_html?: string | null
          template_id?: string | null
          template_version?: number | null
          title?: string
          updated_at?: string
          validation_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_documents_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinical_documents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_documents_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_package_templates: {
        Row: {
          clinic_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          session_count: number
          session_unit_value: number
          total_value: number
          updated_at: string
          validity_days: number
        }
        Insert: {
          clinic_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          session_count: number
          total_value: number
          updated_at?: string
          validity_days: number
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          session_count?: number
          total_value?: number
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_package_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_signatures: {
        Row: {
          assessment_id: string | null
          created_at: string
          device_info: string | null
          document_id: string | null
          id: string
          ip_address: string | null
          patient_id: string
          signature_order: number | null
          signature_png: string
          signed_at: string
          signer_document: string | null
          signer_name: string
          signer_role: Database["public"]["Enums"]["signer_role"]
          user_agent: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          device_info?: string | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          patient_id: string
          signature_order?: number | null
          signature_png: string
          signed_at?: string
          signer_document?: string | null
          signer_name: string
          signer_role: Database["public"]["Enums"]["signer_role"]
          user_agent?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          device_info?: string | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          patient_id?: string
          signature_order?: number | null
          signature_png?: string
          signed_at?: string
          signer_document?: string | null
          signer_name?: string
          signer_role?: Database["public"]["Enums"]["signer_role"]
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_signatures_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "clinical_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_signatures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          active: boolean
          canceled_at: string | null
          created_at: string
          id: string
          nome: string
          plan: string | null
          settings_id: string | null
          slug: string | null
          status: string
          suspended_at: string | null
          is_test: boolean
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          canceled_at?: string | null
          created_at?: string
          id?: string
          is_test?: boolean
          nome: string
          plan?: string | null
          settings_id?: string | null
          slug?: string | null
          status?: string
          suspended_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          canceled_at?: string | null
          created_at?: string
          id?: string
          is_test?: boolean
          nome?: string
          plan?: string | null
          settings_id?: string | null
          slug?: string | null
          status?: string
          suspended_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinics_settings_id_fkey"
            columns: ["settings_id"]
            isOneToOne: false
            referencedRelation: "clinic_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          clinic_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          doc_type: string
          id: string
          is_active: boolean
          is_default: boolean
          layout_config: Json
          name: string
          parent_id: string | null
          required_tags: string[] | null
          sections: Json
          updated_at: string
          version: number
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          doc_type: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          layout_config?: Json
          name: string
          parent_id?: string | null
          required_tags?: string[] | null
          sections?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          doc_type?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          layout_config?: Json
          name?: string
          parent_id?: string | null
          required_tags?: string[] | null
          sections?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "document_templates_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          emitido_em: string
          id: string
          patient_id: string
          pdf_path: string | null
          professional_id: string
          referencia_id: string | null
          tipo: Database["public"]["Enums"]["document_type"]
        }
        Insert: {
          emitido_em?: string
          id?: string
          patient_id: string
          pdf_path?: string | null
          professional_id: string
          referencia_id?: string | null
          tipo: Database["public"]["Enums"]["document_type"]
        }
        Update: {
          emitido_em?: string
          id?: string
          patient_id?: string
          pdf_path?: string | null
          professional_id?: string
          referencia_id?: string | null
          tipo?: Database["public"]["Enums"]["document_type"]
        }
        Relationships: [
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      evolutions: {
        Row: {
          assessment_id: string | null
          avaliacao_algica: Json | null
          clinic_id: string
          conduta: string | null
          created_at: string
          created_by: string | null
          data: string
          eva: number | null
          evolucao_observada: string | null
          fc: string | null
          fr: string | null
          hora: string
          id: string
          inspecao: string | null
          intercorrencias: string | null
          locked_at: string | null
          nivel_consciencia: string | null
          observacoes_gerais: string | null
          pa: string | null
          palpacao: string | null
          patient_id: string
          procedimentos: string | null
          professional_id: string
          proximos_objetivos: string | null
          resposta_paciente: string | null
          sessao_numero: number | null
          sinais_vitais: Json | null
          spo2: string | null
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          avaliacao_algica?: Json | null
          clinic_id: string
          conduta?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          eva?: number | null
          evolucao_observada?: string | null
          fc?: string | null
          fr?: string | null
          hora?: string
          id?: string
          inspecao?: string | null
          intercorrencias?: string | null
          locked_at?: string | null
          nivel_consciencia?: string | null
          observacoes_gerais?: string | null
          pa?: string | null
          palpacao?: string | null
          patient_id: string
          procedimentos?: string | null
          professional_id: string
          proximos_objetivos?: string | null
          resposta_paciente?: string | null
          sessao_numero?: number | null
          sinais_vitais?: Json | null
          spo2?: string | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          avaliacao_algica?: Json | null
          clinic_id?: string
          conduta?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          eva?: number | null
          evolucao_observada?: string | null
          fc?: string | null
          fr?: string | null
          hora?: string
          id?: string
          inspecao?: string | null
          intercorrencias?: string | null
          locked_at?: string | null
          nivel_consciencia?: string | null
          observacoes_gerais?: string | null
          pa?: string | null
          palpacao?: string | null
          patient_id?: string
          procedimentos?: string | null
          professional_id?: string
          proximos_objetivos?: string | null
          resposta_paciente?: string | null
          sessao_numero?: number | null
          sinais_vitais?: Json | null
          spo2?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolutions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolutions_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "evolutions_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolutions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolutions_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_program_items: {
        Row: {
          content_id: string | null
          created_at: string
          custom_title: string | null
          id: string
          notes: string | null
          program_id: string
          reps: number | null
          rest_seconds: number | null
          series: number | null
          sort_order: number | null
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          custom_title?: string | null
          id?: string
          notes?: string | null
          program_id: string
          reps?: number | null
          rest_seconds?: number | null
          series?: number | null
          sort_order?: number | null
        }
        Update: {
          content_id?: string | null
          created_at?: string
          custom_title?: string | null
          id?: string
          notes?: string | null
          program_id?: string
          reps?: number | null
          rest_seconds?: number | null
          series?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_program_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "library_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_program_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "exercise_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_programs: {
        Row: {
          created_at: string
          created_by: string | null
          frequency: string | null
          id: string
          notes: string | null
          patient_id: string | null
          sent_at: string | null
          sent_via: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          frequency?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          frequency?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_programs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          clinic_id: string
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "financial_categories_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_cost_centers: {
        Row: {
          clinic_id: string
          code: string | null
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          clinic_id: string
          code?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          code?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_cost_centers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "financial_cost_centers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          appointment_id: string | null
          category_id: string | null
          clinic_id: string | null
          cost_center_id: string | null
          created_at: string
          created_by: string | null
          data: string
          data_recebimento: string | null
          data_vencimento: string | null
          documento: string | null
          entry_type: string
          forma_pagamento: Database["public"]["Enums"]["payment_method"] | null
          id: string
          observacoes: string | null
          patient_id: string | null
          professional_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          valor: number
        }
        Insert: {
          appointment_id?: string | null
          category_id?: string | null
          clinic_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          data_recebimento?: string | null
          data_vencimento?: string | null
          documento?: string | null
          entry_type?: string
          forma_pagamento?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          observacoes?: string | null
          patient_id: string | null
          professional_id: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          valor: number
        }
        Update: {
          appointment_id?: string | null
          category_id?: string | null
          clinic_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          data_recebimento?: string | null
          data_vencimento?: string | null
          documento?: string | null
          entry_type?: string
          forma_pagamento?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          observacoes?: string | null
          patient_id?: string
          professional_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "financial_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "financial_entries_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      home_care_visits: {
        Row: {
          address: string | null
          checklist: Json | null
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          family_report: string | null
          id: string
          observations: string | null
          patient_id: string | null
          professional_id: string | null | null
          signature_url: string | null
          therapeutic_plan: string | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          address?: string | null
          checklist?: Json | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          family_report?: string | null
          id?: string
          observations?: string | null
          patient_id: string
          professional_id?: string | null
          signature_url?: string | null
          therapeutic_plan?: string | null
          updated_at?: string
          visit_date?: string
        }
        Update: {
          address?: string | null
          checklist?: Json | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          family_report?: string | null
          id?: string
          observations?: string | null
          patient_id?: string
          professional_id?: string | null
          signature_url?: string | null
          therapeutic_plan?: string | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_care_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "home_care_visits_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      library_categories: {
        Row: {
          active: boolean | null
          clinic_id: string | null
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          scope: Database["public"]["Enums"]["library_scope"]
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          clinic_id?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          scope?: Database["public"]["Enums"]["library_scope"]
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          clinic_id?: string | null
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          scope?: Database["public"]["Enums"]["library_scope"]
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_categories_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "library_categories_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "library_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      library_contents: {
        Row: {
          attachments: Json | null
          author: string | null
          body: string | null
          body_json: Json | null
          body_region: string | null
          category_id: string | null
          clinic_id: string | null
          conducts_suggested: string[] | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          difficulty: string | null
          duration_minutes: number | null
          id: string
          level: string | null
          objectives_suggested: string[] | null
          reassessment_days: number | null
          related_diagnoses: string[] | null
          scales_suggested: string[] | null
          scope: Database["public"]["Enums"]["library_scope"]
          slug: string | null
          status: string | null
          suggested_frequency: string | null
          summary: string | null
          tags: string[] | null
          title: string
          type: Database["public"]["Enums"]["library_content_type"]
          updated_at: string
          views_count: number | null
        }
        Insert: {
          attachments?: Json | null
          author?: string | null
          body?: string | null
          body_json?: Json | null
          body_region?: string | null
          category_id?: string | null
          clinic_id?: string | null
          conducts_suggested?: string[] | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          level?: string | null
          objectives_suggested?: string[] | null
          reassessment_days?: number | null
          related_diagnoses?: string[] | null
          scales_suggested?: string[] | null
          scope?: Database["public"]["Enums"]["library_scope"]
          slug?: string | null
          status?: string | null
          suggested_frequency?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          type: Database["public"]["Enums"]["library_content_type"]
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          attachments?: Json | null
          author?: string | null
          body?: string | null
          body_json?: Json | null
          body_region?: string | null
          category_id?: string | null
          clinic_id?: string | null
          conducts_suggested?: string[] | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          id?: string
          level?: string | null
          objectives_suggested?: string[] | null
          reassessment_days?: number | null
          related_diagnoses?: string[] | null
          scales_suggested?: string[] | null
          scope?: Database["public"]["Enums"]["library_scope"]
          slug?: string | null
          status?: string | null
          suggested_frequency?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["library_content_type"]
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_contents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "library_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_contents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "library_contents_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      library_favorites: {
        Row: {
          content_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_favorites_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "library_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_calendar: {
        Row: {
          category: string | null
          channel: string | null
          clinic_id: string | null
          content_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          scheduled_for: string
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          channel?: string | null
          clinic_id?: string | null
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          scheduled_for: string
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          channel?: string | null
          clinic_id?: string | null
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          scheduled_for?: string
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_calendar_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "marketing_calendar_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_calendar_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "library_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      merge_tags: {
        Row: {
          category: string
          created_at: string
          description: string
          example: string | null
          id: string
          is_sensitive: boolean
          tag: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          example?: string | null
          id?: string
          is_sensitive?: boolean
          tag: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          example?: string | null
          id?: string
          is_sensitive?: boolean
          tag?: string
        }
        Relationships: []
      }
      normative_rom: {
        Row: {
          active: boolean
          display_order: number
          id: string
          movement_key: string
          movement_label: string
          normal_max: number
          normal_min: number
          region: string
          unit: string
        }
        Insert: {
          active?: boolean
          display_order?: number
          id?: string
          movement_key: string
          movement_label: string
          normal_max: number
          normal_min: number
          region: string
          unit?: string
        }
        Update: {
          active?: boolean
          display_order?: number
          id?: string
          movement_key?: string
          movement_label?: string
          normal_max?: number
          normal_min?: number
          region?: string
          unit?: string
        }
        Relationships: []
      }
      patient_attachments: {
        Row: {
          created_at: string
          descricao: string | null
          file_path: string
          id: string
          patient_id: string
          tipo: Database["public"]["Enums"]["attachment_type"]
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          file_path: string
          id?: string
          patient_id: string
          tipo?: Database["public"]["Enums"]["attachment_type"]
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          file_path?: string
          id?: string
          patient_id?: string
          tipo?: Database["public"]["Enums"]["attachment_type"]
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_attachments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_discharges: {
        Row: {
          created_at: string
          created_by: string | null
          data_alta: string
          id: string
          locked_at: string | null
          motivo: string
          objetivos_alcancados: string | null
          objetivos_pendentes: string | null
          observacoes: string | null
          patient_id: string
          plano_domiciliar: string | null
          professional_id: string | null
          recomendacoes: string | null
          updated_at: string
          validation_hash: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_alta?: string
          id?: string
          locked_at?: string | null
          motivo: string
          objetivos_alcancados?: string | null
          objetivos_pendentes?: string | null
          observacoes?: string | null
          patient_id: string
          plano_domiciliar?: string | null
          professional_id?: string | null
          recomendacoes?: string | null
          updated_at?: string
          validation_hash?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_alta?: string
          id?: string
          locked_at?: string | null
          motivo?: string
          objetivos_alcancados?: string | null
          objetivos_pendentes?: string | null
          observacoes?: string | null
          patient_id?: string
          plano_domiciliar?: string | null
          professional_id?: string | null
          recomendacoes?: string | null
          updated_at?: string
          validation_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_discharges_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_discharges_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_package_contracts: {
        Row: {
          clinic_id: string
          contracted_at: string
          contracted_value: number
          created_at: string
          financial_entry_id: string | null
          id: string
          package_template_id: string
          patient_id: string
          professional_id: string | null
          sessions_remaining: number
          sessions_total: number
          sessions_used: number
          status: Database["public"]["Enums"]["patient_package_status"]
          updated_at: string
          valid_until: string
        }
        Insert: {
          clinic_id: string
          contracted_at?: string
          contracted_value: number
          created_at?: string
          financial_entry_id?: string | null
          id?: string
          package_template_id: string
          patient_id: string
          professional_id?: string | null
          sessions_total: number
          sessions_used?: number
          status?: Database["public"]["Enums"]["patient_package_status"]
          updated_at?: string
          valid_until: string
        }
        Update: {
          clinic_id?: string
          contracted_at?: string
          contracted_value?: number
          created_at?: string
          financial_entry_id?: string | null
          id?: string
          package_template_id?: string
          patient_id?: string
          professional_id?: string | null
          sessions_total?: number
          sessions_used?: number
          status?: Database["public"]["Enums"]["patient_package_status"]
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_package_contracts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_contracts_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_contracts_package_template_id_fkey"
            columns: ["package_template_id"]
            isOneToOne: false
            referencedRelation: "clinical_package_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_contracts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_contracts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_package_usages: {
        Row: {
          clinic_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          patient_id: string
          patient_package_contract_id: string
          professional_id: string | null
          quantity: number
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: Database["public"]["Enums"]["patient_package_usage_status"]
          usage_date: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          patient_package_contract_id: string
          professional_id?: string | null
          quantity?: number
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["patient_package_usage_status"]
          usage_date?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          patient_package_contract_id?: string
          professional_id?: string | null
          quantity?: number
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["patient_package_usage_status"]
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_package_usages_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_usages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_usages_patient_package_contract_id_fkey"
            columns: ["patient_package_contract_id"]
            isOneToOne: false
            referencedRelation: "patient_package_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_package_usages_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          acompanhante_nome: string | null
          acompanhante_parentesco: string | null
          bairro: string | null
          cep: string | null
          cid_principal: string | null
          cid_secundario: string | null
          cidade: string | null
          clinic_id: string
          contato_recado: string | null
          convenio_carteirinha: string | null
          convenio_nome: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_alta: string | null
          data_nascimento: string | null
          discharge_id: string | null
          endereco: string | null
          endereco_comercial: string | null
          estado: string | null
          estado_civil: string | null
          id: string
          naturalidade: string | null
          nome_completo: string
          observacoes: string | null
          profissao: string | null
          reassessment_interval_days: number | null
          reassessment_notify: boolean | null
          responsavel: string | null
          rg: string | null
          sexo: string | null
          situacao: Database["public"]["Enums"]["entity_status"]
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          acompanhante_nome?: string | null
          acompanhante_parentesco?: string | null
          bairro?: string | null
          cep?: string | null
          cid_principal?: string | null
          cid_secundario?: string | null
          cidade?: string | null
          clinic_id: string
          contato_recado?: string | null
          convenio_carteirinha?: string | null
          convenio_nome?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_alta?: string | null
          data_nascimento?: string | null
          discharge_id?: string | null
          endereco?: string | null
          endereco_comercial?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          naturalidade?: string | null
          nome_completo: string
          observacoes?: string | null
          profissao?: string | null
          reassessment_interval_days?: number | null
          reassessment_notify?: boolean | null
          responsavel?: string | null
          rg?: string | null
          sexo?: string | null
          situacao?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          acompanhante_nome?: string | null
          acompanhante_parentesco?: string | null
          bairro?: string | null
          cep?: string | null
          cid_principal?: string | null
          cid_secundario?: string | null
          cidade?: string | null
          clinic_id?: string
          contato_recado?: string | null
          convenio_carteirinha?: string | null
          convenio_nome?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_alta?: string | null
          data_nascimento?: string | null
          discharge_id?: string | null
          endereco?: string | null
          endereco_comercial?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          naturalidade?: string | null
          nome_completo?: string
          observacoes?: string | null
          profissao?: string | null
          reassessment_interval_days?: number | null
          reassessment_notify?: boolean | null
          responsavel?: string | null
          rg?: string | null
          sexo?: string | null
          situacao?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "patients_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_discharge_id_fkey"
            columns: ["discharge_id"]
            isOneToOne: false
            referencedRelation: "patient_discharges"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_change_audit: {
        Row: {
          changed_by: string | null
          clinic_id: string
          created_at: string
          from_plan_code: string | null
          from_plan_id: string | null
          id: string
          notes: string | null
          to_plan_code: string | null
          to_plan_id: string | null
        }
        Insert: {
          changed_by?: string | null
          clinic_id: string
          created_at?: string
          from_plan_code?: string | null
          from_plan_id?: string | null
          id?: string
          notes?: string | null
          to_plan_code?: string | null
          to_plan_id?: string | null
        }
        Update: {
          changed_by?: string | null
          clinic_id?: string
          created_at?: string
          from_plan_code?: string | null
          from_plan_id?: string | null
          id?: string
          notes?: string | null
          to_plan_code?: string | null
          to_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_audit_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "plan_change_audit_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_audit_from_plan_id_fkey"
            columns: ["from_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_change_audit_to_plan_id_fkey"
            columns: ["to_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean
          annual_price: number | null
          code: string
          created_at: string
          description: string | null
          featured: boolean
          id: string
          max_documents_month: number | null
          max_patients: number | null
          max_storage_mb: number | null
          max_users: number | null
          modules: Json
          monthly_price: number | null
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          annual_price?: number | null
          code: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          max_documents_month?: number | null
          max_patients?: number | null
          max_storage_mb?: number | null
          max_users?: number | null
          modules?: Json
          monthly_price?: number | null
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          annual_price?: number | null
          code?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          max_documents_month?: number | null
          max_patients?: number | null
          max_storage_mb?: number | null
          max_users?: number | null
          modules?: Json
          monthly_price?: number | null
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      professionals: {
        Row: {
          clinic_id: string
          conselho: string | null
          created_at: string
          email: string | null
          especialidade: string | null
          id: string
          nome: string
          profile_id: string | null
          profissao: string
          registro: string | null
          situacao: Database["public"]["Enums"]["entity_status"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          conselho?: string | null
          created_at?: string
          email?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          profile_id?: string | null
          profissao: string
          registro?: string | null
          situacao?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          conselho?: string | null
          created_at?: string
          email?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          profile_id?: string | null
          profissao?: string
          registro?: string | null
          situacao?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professionals_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "professionals_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professionals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reassessment_schedule: {
        Row: {
          base_assessment_id: string | null
          clinic_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          interval_days: number
          notes: string | null
          patient_id: string
          reminder_sent: boolean
          scheduled_for: string
          updated_at: string
        }
        Insert: {
          base_assessment_id?: string | null
          clinic_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interval_days?: number
          notes?: string | null
          patient_id: string
          reminder_sent?: boolean
          scheduled_for: string
          updated_at?: string
        }
        Update: {
          base_assessment_id?: string | null
          clinic_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          interval_days?: number
          notes?: string | null
          patient_id?: string
          reminder_sent?: boolean
          scheduled_for?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reassessment_schedule_base_assessment_id_fkey"
            columns: ["base_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reassessment_schedule_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "reassessment_schedule_clinic_fk"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reassessment_schedule_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          data: string
          description: string | null
          financial_entry_id: string | null
          forma_pagamento: Database["public"]["Enums"]["payment_method"] | null
          id: string
          numero: number
          patient_id: string
          pdf_path: string | null
          professional_id: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          data?: string
          description?: string | null
          financial_entry_id?: string | null
          forma_pagamento?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          numero: number
          patient_id: string
          pdf_path?: string | null
          professional_id?: string | null
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          description?: string | null
          financial_entry_id?: string | null
          forma_pagamento?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          numero?: number
          patient_id?: string
          pdf_path?: string | null
          professional_id?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "receipts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_audit_log: {
        Row: {
          action: string
          clinic_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          clinic_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          clinic_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_audit_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "saas_audit_log_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          active: boolean
          clinic_id: string
          created_at: string
          ended_at: string | null
          id: string
          ip_address: string | null
          notes: string | null
          reason: string | null
          started_at: string
          super_admin_id: string
          user_agent: string | null
        }
        Insert: {
          active?: boolean
          clinic_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          reason?: string | null
          started_at?: string
          super_admin_id: string
          user_agent?: string | null
        }
        Update: {
          active?: boolean
          clinic_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          reason?: string | null
          started_at?: string
          super_admin_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_sessions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_usage"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "support_sessions_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      training_views: {
        Row: {
          completed: boolean | null
          content_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          completed?: boolean | null
          content_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          completed?: boolean | null
          content_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_views_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "library_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      clinic_usage: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          document_count: number | null
          documents_this_month: number | null
          nome: string | null
          plan: string | null
          slug: string | null
          status: string | null
          user_count: number | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          document_count?: never
          documents_this_month?: never
          nome?: string | null
          plan?: string | null
          slug?: string | null
          status?: string | null
          user_count?: never
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          document_count?: never
          documents_this_month?: never
          nome?: string | null
          plan?: string | null
          slug?: string | null
          status?: string | null
          user_count?: never
        }
        Relationships: []
      }
    }
    Functions: {
      apply_canonical_templates: {
        Args: { _clinic_id: string }
        Returns: undefined
      }
      can_access_clinic: { Args: { _clinic_id: string }; Returns: boolean }
      can_access_patient: { Args: { _patient_id: string }; Returns: boolean }
      can_manage_clinic: { Args: { _clinic_id: string }; Returns: boolean }
      current_clinic_id: { Args: never; Returns: string }
      current_plan_limits: {
        Args: never
        Returns: {
          max_documents_month: number
          max_patients: number
          max_storage_mb: number
          max_users: number
        }[]
      }
      current_professional_id: { Args: never; Returns: string }
      current_support_session_clinic: { Args: never; Returns: string }
      end_support_session: { Args: never; Returns: undefined }
      generate_clinic_slug: { Args: { _name: string }; Returns: string }
      has_plan_feature: { Args: { _feature: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in: {
        Args: { _clinic_id: string; _role: string }
        Returns: boolean
      }
      is_member_of: { Args: { _clinic_id: string }; Returns: boolean }
      normalize_document_template_name: {
        Args: { _name: string }
        Returns: string
      }
      provision_clinic: {
        Args: {
          _cidade?: string
          _estado?: string
          _nome: string
          _nome_fantasia?: string
          _owner_user_id?: string
          _plan_code?: string
        }
        Returns: string
      }
      seed_default_document_templates: {
        Args: { _clinic_id: string }
        Returns: undefined
      }
      shares_clinic_with: { Args: { _other_user_id: string }; Returns: boolean }
      start_support_session: {
        Args: { _clinic_id: string; _reason?: string }
        Returns: string
      }
      validate_document_by_hash: {
        Args: { _hash: string }
        Returns: {
          clinica_nome: string
          doc_type: string
          existe: boolean
          hash: string
          issued_at: string
          locked_at: string
          paciente_iniciais: string
          profissional_nome: string
          profissional_registro: string
          status: string
          title: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "physiotherapist"
        | "psychologist"
        | "nutritionist"
        | "occupational_therapist"
        | "speech_therapist"
        | "physical_educator"
        | "physician"
        | "other"
        | "super_admin"
      appointment_status: "agendado" | "confirmado" | "realizado" | "cancelado"
      assessment_module_type:
        | "geral"
        | "traumato_ortopedica"
        | "neurologica"
        | "cardiorrespiratoria"
        | "postural"
        | "geriatrica"
        | "pediatrica"
        | "esportiva"
        | "rpg"
        | "pilates"
        | "dor_cronica"
        | "funcional"
        | "personalizada"
      assessment_status: "rascunho" | "finalizada"
      assessment_type: "avaliacao" | "reavaliacao"
      attachment_type: "exame" | "foto" | "outro"
      document_type:
        | "avaliacao"
        | "reavaliacao"
        | "evolucao"
        | "relatorio"
        | "declaracao"
        | "recibo"
        | "termo"
        | "encaminhamento"
        | "laudo"
        | "contrato"
        | "alta"
        | "plano"
      entity_status: "ativo" | "inativo"
      goal_status:
        | "pendente"
        | "em_andamento"
        | "atingido"
        | "nao_atingido"
        | "cancelado"
      goal_term: "curto" | "medio" | "longo"
      library_content_type:
        | "cartilha"
        | "protocolo"
        | "exercicio"
        | "documento"
        | "marketing"
        | "treinamento"
        | "post_social"
        | "pop"
      library_scope: "global" | "clinic" | "shared"
      payment_method: "pix" | "dinheiro" | "cartao" | "transferencia"
      payment_status: "pago" | "pendente" | "cancelado"
      patient_package_status: "ativo" | "encerrado" | "cancelado"
      patient_package_usage_status: "active" | "reversed"
      risk_level: "baixo" | "moderado" | "alto" | "muito_alto"
      scale_type: "barthel" | "katz" | "berg" | "tinetti" | "braden"
      signer_role: "paciente" | "responsavel" | "profissional"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "physiotherapist",
        "psychologist",
        "nutritionist",
        "occupational_therapist",
        "speech_therapist",
        "physical_educator",
        "physician",
        "other",
        "super_admin",
      ],
      appointment_status: ["agendado", "confirmado", "realizado", "cancelado"],
      assessment_module_type: [
        "geral",
        "traumato_ortopedica",
        "neurologica",
        "cardiorrespiratoria",
        "postural",
        "geriatrica",
        "pediatrica",
        "esportiva",
        "rpg",
        "pilates",
        "dor_cronica",
        "funcional",
        "personalizada",
      ],
      assessment_status: ["rascunho", "finalizada"],
      assessment_type: ["avaliacao", "reavaliacao"],
      attachment_type: ["exame", "foto", "outro"],
      document_type: [
        "avaliacao",
        "reavaliacao",
        "evolucao",
        "relatorio",
        "declaracao",
        "recibo",
        "termo",
        "encaminhamento",
        "laudo",
        "contrato",
        "alta",
        "plano",
      ],
      entity_status: ["ativo", "inativo"],
      goal_status: [
        "pendente",
        "em_andamento",
        "atingido",
        "nao_atingido",
        "cancelado",
      ],
      goal_term: ["curto", "medio", "longo"],
      library_content_type: [
        "cartilha",
        "protocolo",
        "exercicio",
        "documento",
        "marketing",
        "treinamento",
        "post_social",
        "pop",
      ],
      library_scope: ["global", "clinic", "shared"],
      payment_method: ["pix", "dinheiro", "cartao", "transferencia"],
      payment_status: ["pago", "pendente", "cancelado"],
      patient_package_status: ["ativo", "encerrado", "cancelado"],
      patient_package_usage_status: ["active", "reversed"],
      risk_level: ["baixo", "moderado", "alto", "muito_alto"],
      scale_type: ["barthel", "katz", "berg", "tinetti", "braden"],
      signer_role: ["paciente", "responsavel", "profissional"],
    },
  },
} as const
