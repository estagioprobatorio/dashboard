package br.gov.pr.seed.ep.model;

public class Solicitacao {
    private String id;
    private String abaOrigem;
    private int linhaOrigem;
    private String origem; // "Troca de Turma", "Troca de Modalidade", "Vínculos na AF"
    private String dataSolicitacao;
    private String nomeCursista;
    private String emailCursista;
    private String cpf;
    private String cgm;
    private String linhaFuncional;
    private String turmaAntiga;
    private String turmaNova;
    private String codSereNova;
    private String tipoAcao;
    private String motivo;
    private String justificativa;
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

    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }

    public String getCgm() { return cgm; }
    public void setCgm(String cgm) { this.cgm = cgm; }

    public String getLinhaFuncional() { return linhaFuncional; }
    public void setLinhaFuncional(String linhaFuncional) { this.linhaFuncional = linhaFuncional; }

    public String getTurmaAntiga() { return turmaAntiga; }
    public void setTurmaAntiga(String turmaAntiga) { this.turmaAntiga = turmaAntiga; }

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

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotaResolucao() { return notaResolucao; }
    public void setNotaResolucao(String notaResolucao) { this.notaResolucao = notaResolucao; }

    public String getStatusEmail() { return statusEmail; }
    public void setStatusEmail(String statusEmail) { this.statusEmail = statusEmail; }
}
