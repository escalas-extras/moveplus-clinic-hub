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
          created_at: string
          created_by: string | null
          data: string
          duracao_min: number
          horario: string
          id: string
          observacao: string | null
          patient_id: string
          professional_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          duracao_min?: number
          horario: string
          id?: string
          observacao?: string | null
          patient_id: string
          professional_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
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
          cirurgias: string | null
          condutas: string | null
          coordenacao: string | null
          created_at: string
          created_by: string | null
          data: string
          diagnostico_clinico: string | null
          diagnostico_fisio: string | null
          doencas_previas: Json | null
          equilibrio: string | null
          estatura: number | null
          eva: number | null
          exame_fisico: Json | null
          exames_complementares: string | null
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
          locked_at: string | null
          marcha: string | null
          med_cintura: number | null
          med_quadril: number | null
          medicamentos: string | null
          medico_responsavel: string | null
          nivel_consciencia: string | null
          objetivos: string | null
          observacoes_gerais: string | null
          palpacao: string | null
          patient_id: string
          peso: number | null
          postura_alinhamento: Json | null
          professional_id: string
          queixa_principal: string | null
          recursos_terapeuticos: string | null
          semiologia: string | null
          sinais_vitais: Json | null
          status: Database["public"]["Enums"]["assessment_status"]
          tem_exames: boolean | null
          testes_especificos: string | null
          teve_cirurgias: boolean | null
          tipo: Database["public"]["Enums"]["assessment_type"]
          tratamentos_realizados: string | null
          updated_at: string
          usa_medicamentos: boolean | null
        }
        Insert: {
          antecedentes_familiares?: string | null
          antecedentes_pessoais?: string | null
          apresentacao?: string[]
          cirurgias?: string | null
          condutas?: string | null
          coordenacao?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          diagnostico_clinico?: string | null
          diagnostico_fisio?: string | null
          doencas_previas?: Json | null
          equilibrio?: string | null
          estatura?: number | null
          eva?: number | null
          exame_fisico?: Json | null
          exames_complementares?: string | null
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
          locked_at?: string | null
          marcha?: string | null
          med_cintura?: number | null
          med_quadril?: number | null
          medicamentos?: string | null
          medico_responsavel?: string | null
          nivel_consciencia?: string | null
          objetivos?: string | null
          observacoes_gerais?: string | null
          palpacao?: string | null
          patient_id: string
          peso?: number | null
          postura_alinhamento?: Json | null
          professional_id: string
          queixa_principal?: string | null
          recursos_terapeuticos?: string | null
          semiologia?: string | null
          sinais_vitais?: Json | null
          status?: Database["public"]["Enums"]["assessment_status"]
          tem_exames?: boolean | null
          testes_especificos?: string | null
          teve_cirurgias?: boolean | null
          tipo?: Database["public"]["Enums"]["assessment_type"]
          tratamentos_realizados?: string | null
          updated_at?: string
          usa_medicamentos?: boolean | null
        }
        Update: {
          antecedentes_familiares?: string | null
          antecedentes_pessoais?: string | null
          apresentacao?: string[]
          cirurgias?: string | null
          condutas?: string | null
          coordenacao?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          diagnostico_clinico?: string | null
          diagnostico_fisio?: string | null
          doencas_previas?: Json | null
          equilibrio?: string | null
          estatura?: number | null
          eva?: number | null
          exame_fisico?: Json | null
          exames_complementares?: string | null
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
          locked_at?: string | null
          marcha?: string | null
          med_cintura?: number | null
          med_quadril?: number | null
          medicamentos?: string | null
          medico_responsavel?: string | null
          nivel_consciencia?: string | null
          objetivos?: string | null
          observacoes_gerais?: string | null
          palpacao?: string | null
          patient_id?: string
          peso?: number | null
          postura_alinhamento?: Json | null
          professional_id?: string
          queixa_principal?: string | null
          recursos_terapeuticos?: string | null
          semiologia?: string | null
          sinais_vitais?: Json | null
          status?: Database["public"]["Enums"]["assessment_status"]
          tem_exames?: boolean | null
          testes_especificos?: string | null
          teve_cirurgias?: boolean | null
          tipo?: Database["public"]["Enums"]["assessment_type"]
          tratamentos_realizados?: string | null
          updated_at?: string
          usa_medicamentos?: boolean | null
        }
        Relationships: [
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
      clinic_settings: {
        Row: {
          assinatura_padrao_url: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          emails: string[] | null
          endereco: string | null
          estado: string | null
          id: string
          logo_url: string | null
          nome_fantasia: string
          razao_social: string | null
          rodape_institucional: string | null
          telefones: string[] | null
          updated_at: string
        }
        Insert: {
          assinatura_padrao_url?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          emails?: string[] | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia: string
          razao_social?: string | null
          rodape_institucional?: string | null
          telefones?: string[] | null
          updated_at?: string
        }
        Update: {
          assinatura_padrao_url?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          emails?: string[] | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string
          razao_social?: string | null
          rodape_institucional?: string | null
          telefones?: string[] | null
          updated_at?: string
        }
        Relationships: []
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
          intercorrencias: string | null
          locked_at: string | null
          pa: string | null
          patient_id: string
          procedimentos: string | null
          professional_id: string
          proximos_objetivos: string | null
          resposta_paciente: string | null
          sessao_numero: number | null
          spo2: string | null
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
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
          intercorrencias?: string | null
          locked_at?: string | null
          pa?: string | null
          patient_id: string
          procedimentos?: string | null
          professional_id: string
          proximos_objetivos?: string | null
          resposta_paciente?: string | null
          sessao_numero?: number | null
          spo2?: string | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
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
          intercorrencias?: string | null
          locked_at?: string | null
          pa?: string | null
          patient_id?: string
          procedimentos?: string | null
          professional_id?: string
          proximos_objetivos?: string | null
          resposta_paciente?: string | null
          sessao_numero?: number | null
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
      financial_entries: {
        Row: {
          appointment_id: string | null
          created_at: string
          created_by: string | null
          data: string
          forma_pagamento: Database["public"]["Enums"]["payment_method"] | null
          id: string
          observacoes: string | null
          patient_id: string
          professional_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          valor: number
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          forma_pagamento?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          observacoes?: string | null
          patient_id: string
          professional_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          valor: number
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
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
      patients: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          contato_recado: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          endereco: string | null
          endereco_comercial: string | null
          estado: string | null
          estado_civil: string | null
          id: string
          naturalidade: string | null
          nome_completo: string
          observacoes: string | null
          profissao: string | null
          responsavel: string | null
          rg: string | null
          sexo: string | null
          situacao: Database["public"]["Enums"]["entity_status"]
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          contato_recado?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          endereco_comercial?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          naturalidade?: string | null
          nome_completo: string
          observacoes?: string | null
          profissao?: string | null
          responsavel?: string | null
          rg?: string | null
          sexo?: string | null
          situacao?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          contato_recado?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          endereco_comercial?: string | null
          estado?: string | null
          estado_civil?: string | null
          id?: string
          naturalidade?: string | null
          nome_completo?: string
          observacoes?: string | null
          profissao?: string | null
          responsavel?: string | null
          rg?: string | null
          sexo?: string | null
          situacao?: Database["public"]["Enums"]["entity_status"]
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      professionals: {
        Row: {
          conselho: string | null
          created_at: string
          especialidade: string | null
          id: string
          nome: string
          profile_id: string | null
          profissao: string
          registro: string | null
          situacao: Database["public"]["Enums"]["entity_status"]
          updated_at: string
        }
        Insert: {
          conselho?: string | null
          created_at?: string
          especialidade?: string | null
          id?: string
          nome: string
          profile_id?: string | null
          profissao: string
          registro?: string | null
          situacao?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Update: {
          conselho?: string | null
          created_at?: string
          especialidade?: string | null
          id?: string
          nome?: string
          profile_id?: string | null
          profissao?: string
          registro?: string | null
          situacao?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
        }
        Relationships: [
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
      receipts: {
        Row: {
          created_at: string
          data: string
          financial_entry_id: string
          forma_pagamento: Database["public"]["Enums"]["payment_method"] | null
          id: string
          numero: number
          patient_id: string
          pdf_path: string | null
          professional_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          financial_entry_id: string
          forma_pagamento?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          numero?: number
          patient_id: string
          pdf_path?: string | null
          professional_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          financial_entry_id?: string
          forma_pagamento?: Database["public"]["Enums"]["payment_method"] | null
          id?: string
          numero?: number
          patient_id?: string
          pdf_path?: string | null
          professional_id?: string
          valor?: number
        }
        Relationships: [
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
      [_ in never]: never
    }
    Functions: {
      current_professional_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      entity_status: "ativo" | "inativo"
      payment_method: "pix" | "dinheiro" | "cartao" | "transferencia"
      payment_status: "pago" | "pendente"
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
      ],
      entity_status: ["ativo", "inativo"],
      payment_method: ["pix", "dinheiro", "cartao", "transferencia"],
      payment_status: ["pago", "pendente"],
    },
  },
} as const
