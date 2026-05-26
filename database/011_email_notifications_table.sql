-- Track email notifications sent for vehicle document expiry
CREATE TABLE email_notifications (
  id                NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_id        NUMBER        NOT NULL,
  document_id       NUMBER        NOT NULL,
  notification_type VARCHAR2(10)  NOT NULL,
  sent_to           VARCHAR2(255) NOT NULL,
  status            VARCHAR2(10)  DEFAULT 'SENT' NOT NULL,
  error_message     VARCHAR2(1000),
  sent_at           TIMESTAMP     DEFAULT SYSTIMESTAMP,
  CONSTRAINT fk_en_vehicle  FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id)          ON DELETE CASCADE,
  CONSTRAINT fk_en_document FOREIGN KEY (document_id) REFERENCES vehicle_documents(id) ON DELETE CASCADE,
  CONSTRAINT chk_en_type    CHECK (notification_type IN ('2_MONTHS', '1_MONTH', '1_WEEK', 'EXPIRED')),
  CONSTRAINT chk_en_status  CHECK (status IN ('SENT', 'FAILED'))
)
