package br.gov.pr.seed.ep.model;

public class Solicitacao {
    private String id;
    private String abaOrigem;
    private int linhaOrigem;
    private String origem; // "Troca de Turma", "Troca de Modalidade", "Vínculos na AF"
    private String dataSolicitacao;

    // Dados Cadastrais e Funcionais do Cursista
    private String nomeCursista;
    private String emailCursista;
    private String telefoneCursista;
    private String cpf;
    private String rg;
    private String cgm;
    private String linhaFuncional;
    private String nre;
    private String municipio;
    private String modalidade;
    private String componente;
    private String anoFormativo;
    private String chamamento;

    // Dados da Turma Atual (Origem)
    private String turmaAntiga;
    private String diaTurmaAntiga;
    private String horarioTurmaAntiga;
    private String turnoTurmaAntiga;
    private String formadorAntigoNome;
    private String formadorAntigoEmail;
    private String formadorAntigoTelefone;
    private String tutorAntigoNome;
    private String tutorAntigoEmail;
    private String tutorAntigoTelefone;

    // Dados da Solicitação e Destino
    private String turmaNova;
    private String codSereNova;
    private String tipoAcao;
    private String motivo;
    private String justificativa;
    private String modalidadeDetalhes;
    private String comprovante;
    private String status; // "Pendente", "Deferido", "Indeferido"
    private String notaResolucao;
    private String statusEmail;

    public Solicitacao() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAbaOrigem() { return abaOrigem; }
    public void setAbaOrigem(String abaOrigem) { this.abaOrigem = abaOrigem; }

    public int getLinhaOrigem() { return linhaOrigem; }
    public void setLinhaOrigem(int linhaOrigem) { this.linhaOrigem = linhaOrigem; }

    public String getOrigem() { return origem; }
    public void setOrigem(String origem) { this.origem = origem; }

    public String getDataSolicitacao() { return dataSolicitacao; }
    public void setDataSolicitacao(String dataSolicitacao) { this.dataSolicitacao = dataSolicitacao; }

    public String getNomeCursista() { return nomeCursista; }
    public void setNomeCursista(String nomeCursista) { this.nomeCursista = nomeCursista; }

    public String getEmailCursista() { return emailCursista; }
    public void setEmailCursista(String emailCursista) { this.emailCursista = emailCursista; }

    public String getTelefoneCursista() { return telefoneCursista; }
    public void setTelefoneCursista(String telefoneCursista) { this.telefoneCursista = telefoneCursista; }

    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }

    public String getRg() { return rg; }
    public void setRg(String rg) { this.rg = rg; }

    public String getCgm() { return cgm; }
    public void setCgm(String cgm) { this.cgm = cgm; }

    public String getLinhaFuncional() { return linhaFuncional; }
    public void setLinhaFuncional(String linhaFuncional) { this.linhaFuncional = linhaFuncional; }

    public String getNre() { return nre; }
    public void setNre(String nre) { this.nre = nre; }

    public String getMunicipio() { return municipio; }
    public void setMunicipio(String municipio) { this.municipio = municipio; }

    public String getModalidade() { return modalidade; }
    public void setModalidade(String modalidade) { this.modalidade = modalidade; }

    public String getComponente() { return componente; }
    public void setComponente(String componente) { this.componente = componente; }

    public String getAnoFormativo() { return anoFormativo; }
    public void setAnoFormativo(String anoFormativo) { this.anoFormativo = anoFormativo; }

    public String getChamamento() { return chamamento; }
    public void setChamamento(String chamamento) { this.chamamento = chamamento; }

    public String getTurmaAntiga() { return turmaAntiga; }
    public void setTurmaAntiga(String turmaAntiga) { this.turmaAntiga = turmaAntiga; }

    public String getDiaTurmaAntiga() { return diaTurmaAntiga; }
    public void setDiaTurmaAntiga(String diaTurmaAntiga) { this.diaTurmaAntiga = diaTurmaAntiga; }

    public String getHorarioTurmaAntiga() { return horarioTurmaAntiga; }
    public void setHorarioTurmaAntiga(String horarioTurmaAntiga) { this.horarioTurmaAntiga = horarioTurmaAntiga; }

    public String getTurnoTurmaAntiga() { return turnoTurmaAntiga; }
    public void setTurnoTurmaAntiga(String turnoTurmaAntiga) { this.turnoTurmaAntiga = turnoTurmaAntiga; }

    public String getFormadorAntigoNome() { return formadorAntigoNome; }
    public void setFormadorAntigoNome(String formadorAntigoNome) { this.formadorAntigoNome = formadorAntigoNome; }

    public String getFormadorAntigoEmail() { return formadorAntigoEmail; }
    public void setFormadorAntigoEmail(String formadorAntigoEmail) { this.formadorAntigoEmail = formadorAntigoEmail; }

    public String getFormadorAntigoTelefone() { return formadorAntigoTelefone; }
    public void setFormadorAntigoTelefone(String formadorAntigoTelefone) { this.formadorAntigoTelefone = formadorAntigoTelefone; }

    public String getTutorAntigoNome() { return tutorAntigoNome; }
    public void setTutorAntigoNome(String tutorAntigoNome) { this.tutorAntigoNome = tutorAntigoNome; }

    public String getTutorAntigoEmail() { return tutorAntigoEmail; }
    public void setTutorAntigoEmail(String tutorAntigoEmail) { this.tutorAntigoEmail = tutorAntigoEmail; }

    public String getTutorAntigoTelefone() { return tutorAntigoTelefone; }
    public void setTutorAntigoTelefone(String tutorAntigoTelefone) { this.tutorAntigoTelefone = tutorAntigoTelefone; }

    public String getTurmaNova() { return turmaNova; }
    public void setTurmaNova(String turmaNova) { this.turmaNova = turmaNova; }

    public String getCodSereNova() { return codSereNova; }
    public void setCodSereNova(String codSereNova) { this.codSereNova = codSereNova; }

    public String getTipoAcao() { return tipoAcao; }
    public void setTipoAcao(String tipoAcao) { this.tipoAcao = tipoAcao; }

    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }

    public String getJustificativa() { return justificativa; }
    public void setJustificativa(String justificativa) { this.justificativa = justificativa; }

    public String getModalidadeDetalhes() { return modalidadeDetalhes; }
    public void setModalidadeDetalhes(String modalidadeDetalhes) { this.modalidadeDetalhes = modalidadeDetalhes; }

    public String getComprovante() { return comprovante; }
    public void setComprovante(String comprovante) { this.comprovante = comprovante; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotaResolucao() { return notaResolucao; }
    public void setNotaResolucao(String notaResolucao) { this.notaResolucao = notaResolucao; }

    public String getStatusEmail() { return statusEmail; }
    public void setStatusEmail(String statusEmail) { this.statusEmail = statusEmail; }
}
