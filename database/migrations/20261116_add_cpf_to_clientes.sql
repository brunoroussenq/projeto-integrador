ALTER TABLE clientes
    ADD COLUMN cpf CHAR(11) NULL,
    ADD UNIQUE KEY uq_clientes_cpf (cpf);
