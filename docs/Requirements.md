# Flow Configs Requirements

I want to create an Amazon Connect 3rd Party app called "Flow Configs" to provide business users the ability to configure pre-defined configuration variables and prompts. This application will be focused specifically on managing configuration sets and will be part of a potential suite of admin tools.

## Architecture

The app frontend should be written in TypeScript/React/Vite and use Amazon CloudScape UI framework with the Amazon Connect theme.

The app backend will use DynamoDB, Lambda (NodeJS), and API Gateway (via private link). The entire infrastructure will be implemented as a TypeScript CDK application to ensure consistent deployment practices across environments.

### Global Resiliency

The application will be compatible with Amazon Connect Global Resiliency:

- DynamoDB Global Tables will be used to ensure that flow config data exists in both regions for an active/active architecture
- Amazon Verified Permissions policies will be included in the CDK application to replicate them to both regions
- Since Cognito is federated to the Amazon Connect SSO provider, users can log into either regional application without any additional steps

The API authentication will be handled via a shared Cognito user pool which is federated to the same SSO provider as Amazon Connect, so that users will not have a second login. This shared authentication layer can be reused by other admin applications.

The app will be hosted with S3/CloudFront and embedded in Amazon Connect Agent Workspace as a 3rd Party App (iframe) with the name "Flow Configs". This provides users with a "single pane of glass" experience. Access to the app can be administered through the Amazon Connect interface. Users will access the Flow Configs app from the agent workspace only. The app will use the AWS Amplify authentication library to handle the Cognito authentication necessary for API access.

## User Experience

The Flow Configs application has 2 types of users. Admin users can define flow configs which includes variables and prompts. Business users can edit the existing configuration set attribute and prompt values.

### Admin User

An admin user will create a flow config. A flow config is a collection of variables and prompts. A flow config can be retrieved from the Amazon Connect contact flow via the `getConfig` lambda.

A contact flow designer can abstract certain business user configurable features/variables into a flow config. This allows the business user to change an attribute or prompt without having to modify the contact flow.

Example:

- Create a flow config called BasicQueue
  - variables
    - Closure: true/false
    - ClosureOfferCallback: true/false
  - Prompts
    - Welcome
      - en-US
        - voice: "Thank you for calling..."
        - chat: "Thank you for chatting with us..."
      - es-US
        - ...
    - Closure
      - en-US
        - voice: "We are currently closed due to an unforeseen circumstance, please try again later"
        - voice: "We are currently closed due to an unforeseen circumstance, our response may be delayed by 15 minutes"
      - es-US
        - ...
- Implement a contact flow which will
  - call getConfig(id=BasicQueue,lang=en-US)
    - Result:
      - Closure: true/false
      - Welcome: "Thank you for calling..."
      - Closure: "We are currently...."
  - If Closure=true
    - Play Closure prompt.
      - Offer callback if ClosureOfferCallback is true
      - Otherwise, disconnect.
    - Otherwise, play Welcome prompt and continue as needed

Key features:

- The lambda will automatically select the correct language for the prompt. If the current contact is a Chat and a chat prompt variant is available, it will use that.
- This gives the flow designer the ability to offload certain variables to the business user. The business user will be able to affect the behavior of the contact center in certain predefined ways, without requiring an IT change request.
- App should warn about record size limits. DDB supports a maximum record size of 400KB. Amazon connect supports a lambda response size limit of 32KB. We are more likely to hit the lambda limit so combination of returned variables and prompts should be less than that. If we are supporting many different languages, we could potentially hit the 400KB total record size limit.

### Business User

If the building fire alarm goes off, the call center manager can log into the Flow Configs app and change the BasicQueue flow config Closure attribute to `true`. She may also set `ClosureOfferCallback` to true if she knows this is a fire drill, or set it to false if she suspects it is a real fire. Ideally, the application would also be available via mobile device to not put her at risk.

## Use Cases

### Customizing a contact flow (1:1)

- Ability to offload some variables and prompts for the user to make change management easier
- Business users can update prompts and variables without requiring IT change requests
- Reduces the time needed to implement simple changes to contact flows
- Empowers business users to respond quickly to changing business needs

### Defining multiple configurations for 1 contact flow (1:many)

- In the case of field offices, we can define a flow config template which defines all of the field-office specific prompts and variables
- The contact flow would use either the inbound field office number, or a field office id to invoke the GetConfig lambda to retrieve these values
- This approach allows us to define flow experience for 1500 field offices
- Adding a field office is simple: Clone the field office template and change the values
- One-off changes to field office values becomes simple and self-service
- Centralized management of common configurations while allowing for local variations

### Rapid prototyping for specialized features

- In a pinch, FlowConfigs can be used as a rapid prototyping tool for more specialized features
- For example, we can create a flow config named "bad-actors" that doesn't define any prompts, but lists all ANIs for known bad actors as variables
- The attribute value can be a simple "1" or even blank - the existence of the attribute is what matters
- We can create a new lambda called IsBadActor which reads the bad-actors flow config and returns true if the ANI exists in the variables list
- While a more specialized UI might be ideal for certain use cases, this tool provides a place where an analyst can quickly add entries (like bad actors or VIP callers) to a list without requiring development work
