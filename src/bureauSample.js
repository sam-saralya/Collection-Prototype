// A real (production, redacted-in-place) vendor response shape from the
// Experian FCIR pull — kept verbatim so the Credit Bureau tab renders the
// actual field names/nesting bureau responses come back with, instead of a
// hand-rolled dummy shape. Used as a static demo payload for every borrower
// in this prototype (same pattern the old hardcoded CreditReportCard used).
export const BUREAU_SAMPLE = {
  response_timestamp: '2026-08-10T09:01:16.998177218',
  response_code: '200',
  response_message: 'Success',
  success: true,
  response: {
    credit_score: 520,
    credit_report: {
      SCORE: { FCIREXScore: 520, FCIREXScoreConfidLevel: '' },
      TotalCAPS_Summary: {
        TotalCAPSLast90Days: '0',
        TotalCAPSLast7Days: '0',
        TotalCAPSLast30Days: '0',
        TotalCAPSLast180Days: '0',
      },
      CreditProfileHeader: {
        ReportTime: 143113,
        Version: 'V2.4',
        ReportNumber: '1786352472890',
        ReportDate: 20260810,
      },
      NonCreditCAPS: {
        NonCreditCAPS_Summary: {
          NonCreditCAPSLast30Days: '0',
          NonCreditCAPSLast180Days: '0',
          NonCreditCAPSLast90Days: '0',
          NonCreditCAPSLast7Days: '0',
        },
      },
      CAIS_Account: {
        CAIS_Summary: {
          Total_Outstanding_Balance: {
            Outstanding_Balance_Secured: '0',
            Outstanding_Balance_UnSecured_Percentage: '100',
            Outstanding_Balance_All: '265182',
            Outstanding_Balance_Secured_Percentage: '0',
            Outstanding_Balance_UnSecured: '265182',
          },
          Credit_Account: {
            CreditAccountActive: '11',
            CreditAccountClosed: '18',
            CreditAccountDefault: '0',
            CreditAccountTotal: '29',
            CADSuitFiledCurrentBalance: '0',
          },
        },
        CAIS_Account_DETAILS: [
          { Open_Date: '20250117', Account_Type: '61', Subscriber_Name: 'SUGMYA FINANCE PVT LTD', Current_Balance: '7936', Amount_Past_Due: '0', Date_Reported: '20260630', Date_Closed: '', Written_off_Settled_Status: '', Written_Off_Amt_Total: '0', Highest_Credit_or_Original_Loan_Amount: '60000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '06', Year: '2026' }, { Days_Past_Due: '0', Month: '04', Year: '2026' }, { Days_Past_Due: '0', Month: '03', Year: '2026' }, { Days_Past_Due: '317', Month: '02', Year: '2026' }, { Days_Past_Due: '0', Month: '01', Year: '2026' }] },
          { Open_Date: '20240907', Account_Type: '06', Subscriber_Name: 'Bajaj Finance Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20260630', Date_Closed: '', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '15999', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '06', Year: '2026' }] },
          { Open_Date: '20240811', Account_Type: '69', Subscriber_Name: 'Mpokket Financial Services Pvt Ltd', Current_Balance: '2000', Amount_Past_Due: '3120', Date_Reported: '20260716', Date_Closed: '', Written_off_Settled_Status: '02', Written_Off_Amt_Total: '3120', Highest_Credit_or_Original_Loan_Amount: '2000', CAIS_Account_History: [{ Days_Past_Due: '677', Month: '07', Year: '2026' }, { Days_Past_Due: '662', Month: '06', Year: '2026' }] },
          { Open_Date: '20240630', Account_Type: '69', Subscriber_Name: 'Kotak Mahindra Bank Limited', Current_Balance: '21917', Amount_Past_Due: '21917', Date_Reported: '20260723', Date_Closed: '', Written_off_Settled_Status: '08', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '20000', CAIS_Account_History: [{ Days_Past_Due: '688', Month: '07', Year: '2026' }, { Days_Past_Due: '650', Month: '06', Year: '2026' }] },
          { Open_Date: '20240625', Account_Type: '05', Subscriber_Name: 'SI CREVA CAPITAL', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20260630', Date_Closed: '', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '15000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '06', Year: '2026' }] },
          { Open_Date: '20240615', Account_Type: '61', Subscriber_Name: 'IndusInd Bank Limited', Current_Balance: '33130', Amount_Past_Due: '33130', Date_Reported: '20260731', Date_Closed: '', Written_off_Settled_Status: '02', Written_Off_Amt_Total: '33131', Highest_Credit_or_Original_Loan_Amount: '60000', CAIS_Account_History: [{ Days_Past_Due: '600', Month: '07', Year: '2026' }] },
          { Open_Date: '20240522', Account_Type: '61', Subscriber_Name: 'Capital India Finance Ltd', Current_Balance: '8302', Amount_Past_Due: '8484', Date_Reported: '20260716', Date_Closed: '', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '50000', CAIS_Account_History: [{ Days_Past_Due: '509', Month: '07', Year: '2026' }] },
          { Open_Date: '20240317', Account_Type: '05', Subscriber_Name: 'Hero FinCorp Ltd', Current_Balance: '47490', Amount_Past_Due: '28524', Date_Reported: '20260731', Date_Closed: '', Written_off_Settled_Status: '02', Written_Off_Amt_Total: '41144', Highest_Credit_or_Original_Loan_Amount: '56000', CAIS_Account_History: [{ Days_Past_Due: '361', Month: '07', Year: '2026' }] },
          { Open_Date: '20231013', Account_Type: '05', Subscriber_Name: 'SMFG India Credit Company Limited', Current_Balance: '52841', Amount_Past_Due: '48870', Date_Reported: '20260723', Date_Closed: '', Written_off_Settled_Status: '02', Written_Off_Amt_Total: '81098', Highest_Credit_or_Original_Loan_Amount: '120000', CAIS_Account_History: [{ Days_Past_Due: '292', Month: '07', Year: '2026' }] },
          { Open_Date: '20230911', Account_Type: '61', Subscriber_Name: 'SUGMYA FINANCE PVT LTD', Current_Balance: '71126', Amount_Past_Due: '77658', Date_Reported: '20260630', Date_Closed: '', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '200000', CAIS_Account_History: [{ Days_Past_Due: '452', Month: '06', Year: '2026' }] },
          { Open_Date: '20230206', Account_Type: '61', Subscriber_Name: 'IndusInd Bank Limited', Current_Balance: '20440', Amount_Past_Due: '20440', Date_Reported: '20260731', Date_Closed: '', Written_off_Settled_Status: '02', Written_Off_Amt_Total: '20440', Highest_Credit_or_Original_Loan_Amount: '100000', CAIS_Account_History: [{ Days_Past_Due: '604', Month: '07', Year: '2026' }] },
          { Open_Date: '20240806', Account_Type: '05', Subscriber_Name: 'TrillionLoans Fintech Private Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20250615', Date_Closed: '20250519', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '10000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '06', Year: '2025' }] },
          { Open_Date: '20240709', Account_Type: '69', Subscriber_Name: 'Mpokket Financial Services Pvt Ltd', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20240831', Date_Closed: '20240811', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '2000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '08', Year: '2024' }] },
          { Open_Date: '20240704', Account_Type: '05', Subscriber_Name: 'Upmove Capital Pvt Ltd', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20241031', Date_Closed: '20241027', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '500', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '10', Year: '2024' }] },
          { Open_Date: '20240704', Account_Type: '05', Subscriber_Name: 'PayU Finance India PVT Ltd', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20241031', Date_Closed: '20241027', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '9500', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '10', Year: '2024' }] },
          { Open_Date: '20240701', Account_Type: '69', Subscriber_Name: 'TRANSACTREE TECHNOLOGIES PVT LTD', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20250115', Date_Closed: '20241203', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '5000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '01', Year: '2025' }] },
          { Open_Date: '20240625', Account_Type: '05', Subscriber_Name: 'True Credits Private Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20240831', Date_Closed: '20240828', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '1215', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '08', Year: '2024' }] },
          { Open_Date: '20231026', Account_Type: '61', Subscriber_Name: 'IndusInd Bank Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20241215', Date_Closed: '20241014', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '60000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '12', Year: '2024' }] },
          { Open_Date: '20230930', Account_Type: '06', Subscriber_Name: 'HDFC Bank Ltd', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20240630', Date_Closed: '20240606', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '18205', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '06', Year: '2024' }] },
          { Open_Date: '20230908', Account_Type: '61', Subscriber_Name: 'IndusInd Bank Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20240831', Date_Closed: '20240614', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '60000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '08', Year: '2024' }] },
          { Open_Date: '20230809', Account_Type: '50', Subscriber_Name: 'Aye Finance Private Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20260731', Date_Closed: '20260531', Written_off_Settled_Status: '02', Written_Off_Amt_Total: '110289', Highest_Credit_or_Original_Loan_Amount: '163000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '07', Year: '2026' }] },
          { Open_Date: '20230421', Account_Type: '61', Subscriber_Name: 'Seeds Fincap Pvt Ltd', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20250731', Date_Closed: '20250507', Written_off_Settled_Status: '', Written_Off_Amt_Total: '0', Highest_Credit_or_Original_Loan_Amount: '125000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '07', Year: '2025' }] },
          { Open_Date: '20230215', Account_Type: '06', Subscriber_Name: 'Bajaj Finance Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20240531', Date_Closed: '20240428', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '40000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '05', Year: '2024' }] },
          { Open_Date: '20220718', Account_Type: '40', Subscriber_Name: 'IndusInd Bank Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20230430', Date_Closed: '20230206', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '70000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '04', Year: '2023' }] },
          { Open_Date: '20220328', Account_Type: '05', Subscriber_Name: 'SMFG India Credit Company Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20231231', Date_Closed: '20231017', Written_off_Settled_Status: '', Written_Off_Amt_Total: '0', Highest_Credit_or_Original_Loan_Amount: '80000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '12', Year: '2023' }] },
          { Open_Date: '20220324', Account_Type: '61', Subscriber_Name: 'Aye Finance Private Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20231031', Date_Closed: '20230809', Written_off_Settled_Status: '', Written_Off_Amt_Total: '0', Highest_Credit_or_Original_Loan_Amount: '120000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '10', Year: '2023' }] },
          { Open_Date: '20211201', Account_Type: '61', Subscriber_Name: 'IndusInd Bank Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20231130', Date_Closed: '20230908', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '100000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '11', Year: '2023' }] },
          { Open_Date: '20210324', Account_Type: '61', Subscriber_Name: 'Aye Finance Private Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20220731', Date_Closed: '20220324', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '100000', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '07', Year: '2022' }] },
          { Open_Date: '20201130', Account_Type: '06', Subscriber_Name: 'Bajaj Finance Limited', Current_Balance: '0', Amount_Past_Due: '0', Date_Reported: '20230930', Date_Closed: '20230808', Written_off_Settled_Status: '', Written_Off_Amt_Total: '', Highest_Credit_or_Original_Loan_Amount: '10500', CAIS_Account_History: [{ Days_Past_Due: '0', Month: '09', Year: '2023' }] },
        ],
      },
      Match_result: { Exact_match: 'Y' },
      CAPS: {
        CAPS_Summary: { CAPSLast30Days: '0', CAPSLast7Days: '0', CAPSLast180Days: '0', CAPSLast90Days: '0' },
      },
    },
    // Name/mobile/PAN below are anonymized (this response came from a real
    // production pull) — everything else keeps the real field shape/values.
    name: 'SAMPLE BORROWER',
    mobile: '9800000000',
    pan: 'ABCPD1234E',
    client_id: 'TXN-DEMO-00000000-0000-0000-0000-000000000000',
  },
  task_id: 'KYCJDEMO00000000000000',
};
