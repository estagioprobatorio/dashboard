package br.gov.pr.seed.ep.model;

import java.time.LocalDateTime;

public class Movimentacao {
    private String id;
    private String timestamp;
    private String nomeCursista;
    private String emailCursista;
    private String cgm;
    private String cpf;
    private String nre;
    private String tutor;
    private String emailTutor;
    private String turmaAnterior;
    private String turmaNova;
    private String tipoAcao;
    private String motivo;
    private String justificativa;
    private String status;
    private String notaResolucao;
    private String solicitadoPor;

    public Movimentacao() {
        this.timestamp = LocalDateTime.now().toString().replace("T", " ").substring(0, 19);
        this.status = "Deferido";
        this.solicitadoPor = "Sistema Desktop SEED";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTimestamp() { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    public String getNomeCursista() { return nomeCursista; }
    public void setNomeCursista(String nomeCursista) { this.nomeCursista = nomeCursista; }

    public String getEmailCursista() { return emailCursista; }
    public void setEmailCursista(String emailCursista) { this.emailCursista = emailCursista; }

    public String getCgm() { return cgm; }
    public void setCgm(String cgm) { this.cgm = cgm; }

    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }

    public String getNre() { return nre; }
    public void setNre(String nre) { this.nre = nre; }

    public String getTutor() { return tutor; }
    public void setTutor(String tutor) { this.tutor = tutor; }

    public String getEmailTutor() { return emailTutor; }
    public void setEmailTutor(String emailTutor) { this.emailTutor = emailTutor; }

    public String getTurmaAnterior() { return turmaAnterior; }
    public void setTurmaAnterior(String turmaAnterior) { this.turmaAnterior = turmaAnterior; }

    public String getTurmaNova() { return turmaNova; }
    public void setTurmaNova(String turmaNova) { this.turmaNova = turmaNova; }

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

    public String getSolicitadoPor() { return solicitadoPor; }
    public void setSolicitadoPor(String solicitadoPor) { this.solicitadoPor = solicitadoPor; }
}
